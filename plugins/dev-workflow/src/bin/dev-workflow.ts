#!/usr/bin/env node

import {
  getCurrentBranch,
  getRangeDiff,
  getRangeFiles,
  getStagedDiff,
  getStagedFiles,
} from "../core/git.js";
import { findPrTemplate } from "../commands/find-pr-template.js";
import { scanSecrets, type Finding } from "../commands/scan-secrets.js";
import {
  detectScope,
  readPackageNameFromDisk,
} from "../commands/detect-scope.js";
import { detectPackages } from "../commands/detect-packages.js";
import {
  generateUniqueChangesetName,
  listChangesetNames,
} from "../commands/changeset-name.js";
import { readPackageInfo } from "../core/packages.js";
import { readFileSync } from "node:fs";
import { InvalidArgumentError } from "../core/errors.js";
import { detectRunnerInDir } from "../commands/detect-test-runner.js";
import {
  lastChangedAtFromGit,
  readSourceFiles,
  scanTests,
} from "../commands/test-static-scan.js";
import {
  Claim,
  verifyRewrite,
  type VerifyReport,
} from "../commands/test-verify-rewrite.js";
import {
  findCoverageSubsets,
  loadCoverageSets,
  type CoverageUnit,
} from "../commands/coverage-subsets.js";
import { analyseMutationReport } from "../commands/mutation-subsets.js";

const EXIT_CLEAN = 0;
const EXIT_FINDINGS = 1;
const EXIT_ERROR = 2;

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

function parseStringArray(raw: string | undefined, fallback: readonly string[]): readonly string[] {
  if (raw === undefined) return fallback;
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new InvalidArgumentError(`Expected a JSON array of strings, got: ${raw}`);
  }
  return value;
}

function parsePositiveInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new InvalidArgumentError(`--${name} must be a positive integer, got: ${raw}`);
  }
  return value;
}

function parseClaim(raw: string | undefined): Claim {
  if (raw === undefined) return Claim.LINES;
  const claims: readonly string[] = Object.values(Claim);
  if (!claims.includes(raw)) {
    throw new InvalidArgumentError(`--claim must be one of ${claims.join(", ")}, got: ${raw}`);
  }
  return raw as Claim;
}

function printVerify(report: VerifyReport): void {
  console.log(`${report.verdict.toUpperCase()}  ${report.file}`);
  console.log(`  cases:      ${report.baseline.cases ?? "?"} -> ${report.rewrite.cases ?? "?"}`);
  console.log(`  assertions: ${report.assertions.before} -> ${report.assertions.after}`);
  console.log(`  median ms:  ${Math.round(report.baseline.medianMs)} -> ${Math.round(report.rewrite.medianMs)}`);
  if (report.coverage) {
    console.log(`  coverage:   ${report.coverage.before} -> ${report.coverage.after} items, ${report.coverage.lost.length} lost`);
  }
  for (const reason of report.reasons) console.log(`  - ${reason}`);
}

function parseFlags(args: readonly string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = "true";
    }
  }
  return flags;
}

function printHuman(findings: readonly Finding[], scope: string): void {
  if (findings.length === 0) {
    console.log(`No secrets detected in ${scope}.`);
    return;
  }
  console.log(`Found ${findings.length} potential secret(s) in ${scope}:\n`);
  for (const f of findings) {
    const location = f.line !== undefined ? `${f.file}:${f.line}` : f.file;
    const preview = f.preview ? `  ${f.preview}` : "";
    console.log(`  [${f.reason}] ${f.pattern} — ${location}`);
    if (preview) console.log(preview);
  }
  console.log(
    "\nReview each finding. Remove or redact the secret before it leaves your machine if confirmed.",
  );
}

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === "--help" || command === "-h") {
    console.error(
      [
        "Usage: dev-workflow <command> [flags]",
        "",
        "Commands:",
        "  scan-secrets     Scan staged changes (or --range <base>...HEAD) for secrets and sensitive files",
        "  detect-scope     Suggest a Conventional Commits scope from staged files (or --range <base>...HEAD) and branch",
        "  detect-packages  List workspace packages touched by staged files",
        "  changeset-name   Generate an unused adjective-noun-verb name for .changeset/",
        "  find-pr-template Resolve the PR template: repo, then --user-dir, then built-in",
        "  detect-test-runner   Detect the test runner, its command and coverage support",
        "  test-static-scan     Find assertion-free, trivial, skipped, duplicate and sleepy tests",
        "  test-verify-rewrite  Check a test rewrite keeps its cases, assertions and stability",
        "  coverage-subsets     Find test files whose coverage is a subset of another's",
        "  mutation-subsets     Find tests whose kill set is a subset of another's (Stryker report)",
      ].join("\n"),
    );
    return command ? EXIT_CLEAN : EXIT_ERROR;
  }

  const flags = parseFlags(rest);
  const json = flags["json"] === "true";
  const cwd = flags["cwd"] ?? process.cwd();

  try {
    switch (command) {
      case "scan-secrets": {
        const range = flags["range"];
        const result = range
          ? scanSecrets(getRangeFiles(cwd, range), getRangeDiff(cwd, range))
          : scanSecrets(getStagedFiles(cwd), getStagedDiff(cwd));
        if (json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          printHuman(result.findings, range ?? "staged changes");
        }
        return result.findings.length > 0 ? EXIT_FINDINGS : EXIT_CLEAN;
      }
      case "detect-scope": {
        const files = flags["files"]
          ? flags["files"]
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean)
          : flags["range"]
            ? getRangeFiles(cwd, flags["range"])
            : getStagedFiles(cwd);
        const branch =flags["branch"] ?? getCurrentBranch(cwd);
        const result = detectScope(files, branch, (ws, dir) =>
          readPackageNameFromDisk(cwd, ws, dir),
        );
        if (json) {
          console.log(JSON.stringify(result, null, 2));
        } else if (result.suggested) {
          console.log(result.suggested);
        }
        return EXIT_CLEAN;
      }
      case "detect-packages": {
        const files = flags["files"]
          ? flags["files"]
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean)
          : getStagedFiles(cwd);
        const includePrivate = flags["include-private"] === "true";
        const packages = detectPackages(
          files,
          (relDir) => readPackageInfo(cwd, relDir),
          { includePrivate },
        );
        if (json) {
          console.log(JSON.stringify({ packages }, null, 2));
        } else {
          for (const p of packages) {
            console.log(p.name);
          }
        }
        return EXIT_CLEAN;
      }
      case "changeset-name": {
        const dir = flags["dir"] ?? ".changeset";
        const existing = listChangesetNames(cwd, dir);
        const name = generateUniqueChangesetName((n) => !existing.has(n));
        const path = `${dir}/${name}.md`;
        if (json) {
          console.log(JSON.stringify({ name, path }, null, 2));
        } else {
          console.log(path);
        }
        return EXIT_CLEAN;
      }
      case "find-pr-template": {
        const userDir = flags["user-dir"];
        const result = findPrTemplate({
          cwd,
          ...(userDir && userDir !== "true" ? { userDir } : {}),
        });
        if (json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          for (const c of result.candidates) {
            console.log(`${result.source}\t${c}`);
          }
        }
        return EXIT_CLEAN;
      }
      case "detect-test-runner": {
        const result = detectRunnerInDir(flags["cwd"] ?? cwd);
        if (json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`runner: ${result.runner}`);
          console.log(`command: ${result.testCommand?.join(" ") ?? "none"}`);
          for (const note of result.notes) console.log(`note: ${note}`);
        }
        return result.runner === "unknown" ? EXIT_FINDINGS : EXIT_CLEAN;
      }
      case "test-static-scan": {
        const root = flags["cwd"] ?? cwd;
        const report = scanTests(readSourceFiles(root), {
          now: Date.now(),
          lastChangedAt: lastChangedAtFromGit(root),
        });
        if (json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(`${report.tests} tests in ${report.testFiles} files`);
          console.log(`assertion-free: ${report.assertionFree.length}`);
          console.log(`trivial assertions: ${report.trivialAssertion.length}`);
          console.log(`duplicate groups: ${report.duplicates.length}`);
          console.log(`parameterisable groups: ${report.parameterisable.length}`);
          console.log(`sleep/timer tests: ${report.sleepTests.length}`);
          console.log(`skipped/todo: ${report.skipped.length}`);
        }
        return EXIT_CLEAN;
      }
      case "test-verify-rewrite": {
        if (!flags["file"] || !flags["rewritten"]) {
          throw new InvalidArgumentError(
            "test-verify-rewrite needs --file <path> and --rewritten <path>.",
          );
        }
        const report = verifyRewrite({
          cwd: flags["cwd"] ?? cwd,
          file: flags["file"],
          rewrittenPath: flags["rewritten"],
          command: parseStringArray(flags["command"], []),
          shuffleArgs: parseStringArray(flags["shuffle-args"], []),
          runs: parsePositiveInt(flags["runs"], 3, "runs"),
          timeoutMs: parsePositiveInt(flags["timeout-ms"], DEFAULT_TIMEOUT_MS, "timeout-ms"),
          claim: parseClaim(flags["claim"]),
          coverageCommand: flags["coverage-command"]
            ? parseStringArray(flags["coverage-command"], [])
            : null,
        });
        if (json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          printVerify(report);
        }
        return report.verdict === "pass" ? EXIT_CLEAN : EXIT_FINDINGS;
      }
      case "coverage-subsets": {
        if (!flags["units"]) {
          throw new InvalidArgumentError("coverage-subsets needs --units <path to JSON array>.");
        }
        const units = JSON.parse(readFileSync(flags["units"], "utf-8")) as CoverageUnit[];
        const result = findCoverageSubsets(loadCoverageSets(units));
        if (json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          for (const s of result.subsets) {
            console.log(`${s.id}\t${Math.round(s.durationMs)}ms\tcovered by ${s.coveredBy.join(", ")}`);
          }
        }
        return result.subsets.length > 0 ? EXIT_FINDINGS : EXIT_CLEAN;
      }
      case "mutation-subsets": {
        if (!flags["report"]) {
          throw new InvalidArgumentError("mutation-subsets needs --report <path to Stryker JSON>.");
        }
        const result = analyseMutationReport(readFileSync(flags["report"], "utf-8"));
        if (json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          if (result.bailSuspected) {
            console.log("warning: bail mode suspected; rerun Stryker with disableBail: true");
          }
          for (const s of result.subsets) {
            console.log(`${s.name}\tkills ${s.kills}\tsubsumed by ${s.subsumedBy.map((t) => t.name).join(", ")}`);
          }
        }
        return result.subsets.length > 0 ? EXIT_FINDINGS : EXIT_CLEAN;
      }
      default:
        console.error(`Unknown command: ${command}`);
        return EXIT_ERROR;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (json) {
      console.error(JSON.stringify({ error: message }));
    } else {
      console.error(`Error: ${message}`);
    }
    return EXIT_ERROR;
  }
}

main().then((code) => {
  process.exit(code);
});
