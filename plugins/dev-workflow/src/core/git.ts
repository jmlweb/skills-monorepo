import { execFileSync } from "node:child_process";
import { GitError } from "./errors.js";

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
