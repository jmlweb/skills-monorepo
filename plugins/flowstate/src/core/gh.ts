import { execFile } from "node:child_process";
import {
  GhAuthError,
  GhCommandError,
  GhMissingError,
  GhRepoError,
} from "./errors.js";

// The one way flowstate talks to GitHub: `gh` on PATH, spawned like `git` is in paths.ts.
// No npm dependency, no HTTP client; gh owns auth, hosts and pagination.
export interface GhRunOptions {
  readonly input?: string;
}

export type GhRunner = (args: readonly string[], options?: GhRunOptions) => Promise<string>;

export interface GhRunnerConfig {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  // Every command is a network call; hooks and next-task must not hang on a slow host.
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;

// Classifies a failed gh run by its stderr. Exit codes alone say nothing: gh uses 1 for
// auth, repo and API errors alike.
export function classifyGhFailure(
  args: readonly string[],
  stderr: string,
  repo?: string,
): Error {
  if (/not logged in|auth login|authentication required|gh auth/i.test(stderr)) {
    return new GhAuthError(stderr);
  }
  if (/could not resolve to a repository|repository not found|no git remotes found|not a git repository/i.test(stderr)) {
    return new GhRepoError(repo ?? repoFromArgs(args) ?? "(current checkout)", stderr);
  }
  return new GhCommandError(args, stderr);
}

function repoFromArgs(args: readonly string[]): string | undefined {
  const idx = args.findIndex((a) => a === "--repo" || a === "-R");
  return idx === -1 ? undefined : args[idx + 1];
}

export function createGhRunner(config: GhRunnerConfig = {}): GhRunner {
  const timeout = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return (args, options = {}) =>
    new Promise<string>((resolve, reject) => {
      const child = execFile(
        "gh",
        [...args],
        {
          ...(config.cwd !== undefined ? { cwd: config.cwd } : {}),
          env: config.env ?? process.env,
          encoding: "utf-8",
          timeout,
          maxBuffer: 64 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
          if (!error) {
            resolve(stdout);
            return;
          }
          const code = (error as NodeJS.ErrnoException).code;
          if (code === "ENOENT") {
            reject(new GhMissingError());
            return;
          }
          if ((error as { killed?: boolean }).killed === true) {
            reject(new GhCommandError(args, `timed out after ${timeout}ms`));
            return;
          }
          reject(classifyGhFailure(args, stderr || error.message));
        },
      );
      if (child.stdin) {
        if (options.input !== undefined) child.stdin.end(options.input);
        else child.stdin.end();
      }
    });
}

// gh prints valid JSON for --json; anything else is a bug worth surfacing, not a silent [].
export async function ghJson<T>(
  gh: GhRunner,
  args: readonly string[],
  options?: GhRunOptions,
): Promise<T> {
  const out = await gh(args, options);
  try {
    return JSON.parse(out) as T;
  } catch {
    throw new GhCommandError(args, `returned non-JSON output: ${out.slice(0, 200)}`);
  }
}
