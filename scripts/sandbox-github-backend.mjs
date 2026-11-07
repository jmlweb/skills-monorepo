#!/usr/bin/env node
// Opt-in live check of the flowstate GitHub backend against a real, throwaway repository.
// Never part of `pnpm test`: it needs `gh` logged in with issue write access and it
// creates issues (closed at the end, never deleted: gh issue delete needs delete_repo).
//
//   pnpm sandbox:github-backend --repo owner/name   build, run the lifecycle, verify via gh
//
// Standalone on purpose: scripts/sandbox-lib.mjs drives Claude skills over a git
// fixture, while this exercises the compiled CLI directly.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "plugins", "flowstate", "dist", "bin", "flowstate.js");

export const USAGE = "Usage: node scripts/sandbox-github-backend.mjs --repo owner/name";

export function parseArgs(argv) {
  const idx = argv.indexOf("--repo");
  const repo = idx === -1 ? undefined : argv[idx + 1];
  if (repo === undefined || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return { error: `${USAGE}\n--repo is required and takes the owner/name form; nothing runs without it.` };
  }
  return { repo };
}

// What the live run must leave behind, keyed by the created issue's role. `labels` is
// the exact set, `state` the issue state after the lifecycle.
export const EXPECTED = {
  task: { state: "CLOSED", labels: ["flowstate:task", "P2", "sandbox"] },
  idea: { state: "CLOSED", labels: ["flowstate:idea", "status:approved"] },
  report: { state: "CLOSED", labels: ["flowstate:report", "status:discarded"] },
};

// Compares `gh issue view --json state,labels` results with EXPECTED; pure, so it is tested.
export function checkIssues(fetched) {
  const failures = [];
  for (const [role, expected] of Object.entries(EXPECTED)) {
    const issue = fetched[role];
    if (!issue) {
      failures.push(`${role}: no issue was created`);
      continue;
    }
    if (issue.state !== expected.state) failures.push(`${role} #${issue.number}: state ${issue.state}, expected ${expected.state}`);
    const names = issue.labels.map((l) => l.name).sort();
    const want = [...expected.labels].sort();
    if (JSON.stringify(names) !== JSON.stringify(want)) {
      failures.push(`${role} #${issue.number}: labels [${names.join(", ")}], expected [${want.join(", ")}]`);
    }
  }
  return failures;
}

function cli(cwd, env, args, input) {
  const out = execFileSync("node", [CLI, ...args, "--json", "true"], {
    cwd, env, encoding: "utf-8", timeout: 60000, ...(input !== undefined ? { input } : {}),
  });
  return JSON.parse(out);
}

export function runLifecycle(repo, { cwd, env }) {
  const stamp = new Date().toISOString();
  const setup = cli(cwd, env, ["setup", "--github", "--repo", repo, "--project-name", "Sandbox"]);
  console.log(`setup --github: ${setup.labels.length} labels on ${setup.repo}, learnings at ${setup.root}`);

  const task = cli(cwd, env, ["task-create", "--title", `Sandbox task ${stamp}`, "--priority", "P2", "--tags", "sandbox", "--description", "Created by scripts/sandbox-github-backend.mjs", "--criteria", '["Lifecycle ran"]']);
  console.log(`task-create: ${task.id} ${task.path}`);
  cli(cwd, env, ["task-move", task.id, "--to", "active"]);
  cli(cwd, env, ["task-block", task.id, "--reason", "sandbox block"]);
  const blocked = cli(cwd, env, ["task-list", "--status", "blocked"]).map((t) => t.id);
  if (!blocked.includes(task.id)) throw new Error(`task-list --status blocked does not list ${task.id}: ${blocked.join(", ")}`);
  cli(cwd, env, ["task-unblock", task.id, "--resolution", "sandbox unblock"]);
  cli(cwd, env, ["task-update", task.id, "--check", "1", "--log", "sandbox progress"]);
  cli(cwd, env, ["task-move", task.id, "--to", "complete"]);

  const idea = cli(cwd, env, ["idea-create", "--title", `Sandbox idea ${stamp}`, "--complexity", "low", "--body", "## Goal\n\nSandbox."]);
  cli(cwd, env, ["idea-move", idea.id, "--status", "approved", "--task-id", task.id]);
  const report = cli(cwd, env, ["report-create", "--title", `Sandbox report ${stamp}`, "--type", "finding", "--severity", "low", "--body", "Sandbox."]);
  cli(cwd, env, ["report-move", report.id, "--status", "discarded"]);

  const stats = cli(cwd, env, ["stats"]);
  const doctor = cli(cwd, env, ["task-doctor"]);
  console.log(`stats: ${JSON.stringify(stats)}`);
  console.log(`task-doctor: scanned ${doctor.scanned}, fixed ${doctor.fixed.length}, invalid ${doctor.invalid.length}`);

  const numberOf = (id) => Number(id.split("-")[1]);
  return { task: numberOf(task.id), idea: numberOf(idea.id), report: numberOf(report.id) };
}

function fetchIssues(repo, numbers) {
  return Object.fromEntries(
    Object.entries(numbers).map(([role, number]) => [
      role,
      JSON.parse(execFileSync("gh", ["issue", "view", String(number), "--repo", repo, "--json", "number,state,labels"], { encoding: "utf-8" })),
    ]),
  );
}

export function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    console.error(parsed.error);
    return 2;
  }
  const build = spawnSync("pnpm", ["--filter", "@flowstate/cli", "build"], { cwd: ROOT, stdio: "inherit" });
  if (build.status !== 0) return 2;

  const dir = mkdtempSync(join(tmpdir(), "flowstate-github-sandbox-"));
  const env = {
    ...process.env,
    FLOWSTATE_BACKEND: "github",
    FLOWSTATE_GITHUB_REPO: parsed.repo,
    // A throwaway backlog must not register in the developer's shared registry (LRN-035).
    FLOWSTATE_SHARED: "off",
  };
  delete env.FLOWSTATE_BACKLOG_DIR;
  try {
    const numbers = runLifecycle(parsed.repo, { cwd: dir, env });
    const failures = checkIssues(fetchIssues(parsed.repo, numbers));
    console.log(`\nIssues left closed in ${parsed.repo}: #${numbers.task} (task), #${numbers.idea} (idea), #${numbers.report} (report)`);
    if (failures.length === 0) {
      console.log("\nPASS  lifecycle ran on real issues; labels and states match the file-mode model");
      return 0;
    }
    console.log(`\nFAIL\n${failures.map((f) => `  - ${f}`).join("\n")}`);
    return 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
