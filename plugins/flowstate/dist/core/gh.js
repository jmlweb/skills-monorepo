import { execFile } from "node:child_process";
import { GhAuthError, GhCommandError, GhMissingError, GhRepoError, } from "./errors.js";
const DEFAULT_TIMEOUT_MS = 20_000;
// Classifies a failed gh run by its stderr. Exit codes alone say nothing: gh uses 1 for
// auth, repo and API errors alike.
export function classifyGhFailure(args, stderr, repo) {
    if (/not logged in|auth login|authentication required|gh auth/i.test(stderr)) {
        return new GhAuthError(stderr);
    }
    if (/could not resolve to a repository|repository not found|no git remotes found|not a git repository/i.test(stderr)) {
        return new GhRepoError(repo ?? repoFromArgs(args) ?? "(current checkout)", stderr);
    }
    return new GhCommandError(args, stderr);
}
function repoFromArgs(args) {
    const idx = args.findIndex((a) => a === "--repo" || a === "-R");
    if (idx !== -1)
        return args[idx + 1];
    // `gh repo view <owner/name>` names the repo positionally.
    const positional = args[0] === "repo" && args[1] === "view" ? args[2] : undefined;
    return positional !== undefined && !positional.startsWith("-") ? positional : undefined;
}
export function createGhRunner(config = {}) {
    const timeout = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    return (args, options = {}) => new Promise((resolve, reject) => {
        const child = execFile("gh", [...args], {
            ...(config.cwd !== undefined ? { cwd: config.cwd } : {}),
            env: config.env ?? process.env,
            encoding: "utf-8",
            timeout,
            maxBuffer: 64 * 1024 * 1024,
        }, (error, stdout, stderr) => {
            if (!error) {
                resolve(stdout);
                return;
            }
            const code = error.code;
            if (code === "ENOENT") {
                reject(new GhMissingError());
                return;
            }
            if (error.killed === true) {
                reject(new GhCommandError(args, `timed out after ${timeout}ms`));
                return;
            }
            reject(classifyGhFailure(args, stderr || error.message));
        });
        if (child.stdin) {
            if (options.input !== undefined)
                child.stdin.end(options.input);
            else
                child.stdin.end();
        }
    });
}
// gh prints valid JSON for --json; anything else is a bug worth surfacing, not a silent [].
export async function ghJson(gh, args, options) {
    const out = await gh(args, options);
    try {
        return JSON.parse(out);
    }
    catch {
        throw new GhCommandError(args, `returned non-JSON output: ${out.slice(0, 200)}`);
    }
}
