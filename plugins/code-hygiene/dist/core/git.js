import { execFileSync } from "node:child_process";
import { GitError } from "./errors.js";
const MAX_BUFFER = 64 * 1024 * 1024;
function runGit(cwd, args) {
    try {
        return execFileSync("git", ["-c", "core.quotePath=false", ...args], {
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
// Null means git has no history for the file (untracked), not that git failed.
export function getLastCommitTime(cwd, file) {
    const out = runGit(cwd, ["log", "-1", "--format=%ct", "--", file]).trim();
    return out ? Number(out) * 1000 : null;
}
