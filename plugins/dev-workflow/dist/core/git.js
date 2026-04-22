import { execFileSync } from "node:child_process";
import { GitError } from "./errors.js";
const MAX_BUFFER = 64 * 1024 * 1024;
function runGit(cwd, args) {
    try {
        return execFileSync("git", args, {
            cwd,
            encoding: "utf-8",
            maxBuffer: MAX_BUFFER,
            stdio: ["ignore", "pipe", "pipe"],
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new GitError(`git ${args.join(" ")} failed: ${message}`);
    }
}
export function getStagedFiles(cwd) {
    const out = runGit(cwd, [
        "diff",
        "--cached",
        "--name-only",
        "--diff-filter=AM",
    ]);
    return out.split("\n").filter((line) => line.length > 0);
}
export function getStagedDiff(cwd) {
    return runGit(cwd, [
        "diff",
        "--cached",
        "--unified=0",
        "--no-color",
        "--diff-filter=AM",
    ]);
}
export function getCurrentBranch(cwd) {
    const out = runGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
    return out === "HEAD" ? "" : out;
}
