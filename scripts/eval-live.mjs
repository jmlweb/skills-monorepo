#!/usr/bin/env node
// Tier-2 live eval recorder: runs a plugin's `claude plugin eval` suite and appends one JSONL line
// per case to docs/metrics/evals.jsonl, so pass rates build a dated history instead of a single
// progress-log line. Meant for the weekly launchd job; it never pushes.
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HISTORY_FILE = "docs/metrics/evals.jsonl";
// Pinned so runs stay comparable week to week; a model change is a deliberate edit here.
export const MODEL = "sonnet";
export const MAX_COST_USD = 3;
export const EXIT_PRECONDITION = 3;

const round = (n) => Math.round(n * 10000) / 10000;

export function summarize(result) {
  const plugin = result.suite.plugins[0] ?? { name: "unknown", version: "unknown" };
  const base = {
    date: result.startedAt,
    claudeVersion: result.claudeVersion,
    plugin: plugin.name,
    pluginVersion: plugin.version,
    model: result.suite.modelOverride ?? "default",
  };
  const cases = result.cases.map((c) => {
    const runs = c.arms.with ?? [];
    return {
      ...base,
      case: c.name,
      runs: runs.length,
      passed: runs.filter((r) => r.passed).length,
      passRate: c.aggregates.passRate,
      costUsd: round(runs.reduce((sum, r) => sum + (r.costUsd ?? 0) + (r.judgeCostUsd ?? 0), 0)),
      errors: runs.map((r) => r.error).filter(Boolean),
    };
  });
  const suite = {
    ...base,
    case: "*",
    casesPassed: result.aggregates.casesPassed,
    casesTotal: result.aggregates.casesTotal,
    passRate: result.aggregates.overallPassRate,
    costUsd: round(result.costUsd),
    partial: result.partial,
  };
  return [...cases, suite];
}

// A scheduled run must never commit on top of work in progress or on a feature branch.
export function checkPreconditions({ branch, porcelain }) {
  if (branch !== "main") return `on branch "${branch}", not main`;
  if (porcelain.trim() !== "") return "working tree is not clean";
  return null;
}

const git = (root, args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });

function main(argv) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const pluginArg = argv.indexOf("--plugin");
  const pluginName = pluginArg === -1 ? "flowstate" : argv[pluginArg + 1];
  const commit = !argv.includes("--no-commit");

  if (commit) {
    const problem = checkPreconditions({
      branch: git(root, ["rev-parse", "--abbrev-ref", "HEAD"]).trim(),
      porcelain: git(root, ["status", "--porcelain"]),
    });
    if (problem) {
      console.error(`eval-live: skipped, ${problem}`);
      process.exit(EXIT_PRECONDITION);
    }
  }

  const jsonPath = join(mkdtempSync(join(tmpdir(), "eval-live-")), "result.json");
  // --threshold 0: a failing case is a data point to record, not a crash.
  const run = spawnSync(
    "claude",
    [
      "plugin", "eval", join("plugins", pluginName),
      "--tag", "routing",
      "--model", MODEL,
      "--ablation", "none",
      "--no-publish",
      "--trust-plugin",
      "--max-cost-usd", String(MAX_COST_USD),
      "--threshold", "0",
      "--json", jsonPath,
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (run.status !== 0 && run.status !== 2) {
    console.error(`eval-live: claude plugin eval exited ${run.status}`);
    process.exit(run.status ?? 1);
  }

  const records = summarize(JSON.parse(readFileSync(jsonPath, "utf8")));
  const historyPath = join(root, HISTORY_FILE);
  mkdirSync(dirname(historyPath), { recursive: true });
  appendFileSync(historyPath, records.map((r) => `${JSON.stringify(r)}\n`).join(""));

  const suite = records.at(-1);
  console.log(
    `eval-live: ${suite.plugin} ${suite.casesPassed}/${suite.casesTotal} cases passed, $${suite.costUsd}${suite.partial ? " (partial)" : ""}`,
  );
  if (commit) {
    git(root, ["add", HISTORY_FILE]);
    git(root, ["commit", "-m", `chore(evals): record live eval run ${suite.date.slice(0, 10)}`, "--", HISTORY_FILE]);
  }
  process.exit(records.slice(0, -1).every((r) => r.passRate === 1) ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
