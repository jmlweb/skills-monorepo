import { execFileSync } from "node:child_process";
import { GitError, InvalidArgumentError } from "./errors.js";

const MAX_BUFFER = 64 * 1024 * 1024;

function runGit(cwd: string, args: readonly string[]): string {
  try {
    return execFileSync("git", args, {
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
    "--diff-filter=AM",
  ]);
  return out.split("\n").filter((line) => line.length > 0);
}

export function getStagedDiff(cwd: string): string {
  return runGit(cwd, [
    "diff",
    "--cached",
    "--unified=0",
    "--no-color",
    "--diff-filter=AM",
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
    "--diff-filter=AM",
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
    "--diff-filter=AM",
    range,
    "--",
  ]);
}

export function getCurrentBranch(cwd: string): string {
  const out = runGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
  return out === "HEAD" ? "" : out;
}
