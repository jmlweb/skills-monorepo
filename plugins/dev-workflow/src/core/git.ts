import { execFileSync } from "node:child_process";
import { GitError, InvalidArgumentError } from "./errors.js";

const MAX_BUFFER = 64 * 1024 * 1024;

// User config must not change the output we parse: quotePath would octal-escape
// non-ASCII names, and diff.noprefix / diff.mnemonicPrefix / diff.external would
// change or replace the `+++ b/<path>` headers scanDiff relies on.
const PINNED_CONFIG = ["-c", "core.quotePath=false"] as const;
const PINNED_DIFF_FORMAT = [
  "--src-prefix=a/",
  "--dst-prefix=b/",
  "--no-ext-diff",
] as const;

// Rename detection is on by default, so a moved file reports R (or C for a copy
// under diff.renames=copies) instead of A; dropping those would let a rename to
// .env or a secret added during a move skip the scan.
const CHANGED_PATHS_FILTER = "--diff-filter=ACMR";

function runGit(cwd: string, args: readonly string[]): string {
  try {
    return execFileSync("git", [...PINNED_CONFIG, ...args], {
      cwd,
      encoding: "utf-8",
      maxBuffer: MAX_BUFFER,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new GitError(`git ${args.join(" ")} failed: ${message}`);
  }
}

export function getStagedFiles(cwd: string): string[] {
  const out = runGit(cwd, [
    "diff",
    "--cached",
    "--name-only",
    CHANGED_PATHS_FILTER,
  ]);
  return out.split("\n").filter((line) => line.length > 0);
}

export function getStagedDiff(cwd: string): string {
  return runGit(cwd, [
    "diff",
    "--cached",
    "--unified=0",
    "--no-color",
    ...PINNED_DIFF_FORMAT,
    CHANGED_PATHS_FILTER,
  ]);
}

// A range is passed straight to git, so reject anything that could be read as
// an option and require the explicit three-dot form the skills document.
export function assertRange(range: string): void {
  if (!/^[^\s-]\S*\.\.\.\S+$/.test(range)) {
    throw new InvalidArgumentError(
      `Invalid --range "${range}". Expected <base>...HEAD (for example origin/main...HEAD).`,
    );
  }
}

export function getRangeFiles(cwd: string, range: string): string[] {
  assertRange(range);
  const out = runGit(cwd, [
    "diff",
    "--name-only",
    CHANGED_PATHS_FILTER,
    range,
    "--",
  ]);
  return out.split("\n").filter((line) => line.length > 0);
}

export function getRangeDiff(cwd: string, range: string): string {
  assertRange(range);
  return runGit(cwd, [
    "diff",
    "--unified=0",
    "--no-color",
    ...PINNED_DIFF_FORMAT,
    CHANGED_PATHS_FILTER,
    range,
    "--",
  ]);
}

export function getCurrentBranch(cwd: string): string {
  const out = runGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
  return out === "HEAD" ? "" : out;
}
