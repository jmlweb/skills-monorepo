import { FileStore } from "./file-store.js";
import { GithubStore } from "./github-store.js";
import { createGhRunner, ghJson, type GhRunner } from "./gh.js";
import { GhRepoError, InvalidArgumentError } from "./errors.js";
import type { BacklogStore } from "./store.js";

export const BACKEND_ENV = "FLOWSTATE_BACKEND";
export const GITHUB_REPO_ENV = "FLOWSTATE_GITHUB_REPO";

export type Backend = "file" | "github";

export interface ResolvedStore {
  readonly backend: Backend;
  readonly store: BacklogStore;
  // Set in GitHub mode only: the owner/name the issues live in.
  readonly repo?: string;
}

type Env = Readonly<Record<string, string | undefined>>;

// "github" selects GitHub Issues; anything else keeps the files (PLN-027 step 9).
export function backendOf(env: Env = process.env): Backend {
  return (env[BACKEND_ENV] ?? "").trim().toLowerCase() === "github" ? "github" : "file";
}

export function validateRepo(value: string): string {
  const repo = value.trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new InvalidArgumentError(`Invalid repository "${value}". Use the owner/name form, e.g. acme/widgets.`);
  }
  return repo;
}

// FLOWSTATE_GITHUB_REPO wins; otherwise gh resolves the checkout's remote.
export async function resolveRepo(gh: GhRunner, env: Env = process.env): Promise<string> {
  const configured = env[GITHUB_REPO_ENV];
  if (configured !== undefined && configured.trim() !== "") return validateRepo(configured);
  const view = await ghJson<{ nameWithOwner?: string }>(gh, ["repo", "view", "--json", "nameWithOwner"]);
  if (typeof view.nameWithOwner !== "string" || view.nameWithOwner === "") {
    throw new GhRepoError("(current checkout)", "gh repo view returned no nameWithOwner");
  }
  return view.nameWithOwner;
}

// `root` is the backlog directory in both modes: the file backend keeps everything there,
// the GitHub backend keeps only learnings there.
export async function resolveStore(
  root: string,
  cwd: string,
  env: Env = process.env,
  gh: GhRunner = createGhRunner({ cwd, env: env as NodeJS.ProcessEnv }),
): Promise<ResolvedStore> {
  if (backendOf(env) === "file") {
    return { backend: "file", store: new FileStore(root) };
  }
  const repo = await resolveRepo(gh, env);
  return { backend: "github", store: new GithubStore(repo, gh), repo };
}
