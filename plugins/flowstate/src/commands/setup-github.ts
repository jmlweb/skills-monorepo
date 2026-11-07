import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { ensureDir } from "../core/fs.js";
import { learningsIndexPath } from "../core/paths.js";
import type { GhRunner } from "../core/gh.js";
import { ghJson } from "../core/gh.js";
import { GhAuthError, GhRepoError } from "../core/errors.js";
import { FLOWSTATE_LABELS } from "../core/github-store.js";
import { LEARNINGS_INDEX_TEMPLATE } from "./setup.js";

export interface SetupGithubInput {
  readonly repo: string;
  readonly projectName: string;
}

export interface SetupGithubResult {
  readonly root: string;
  readonly repo: string;
  readonly labels: readonly string[];
}

// GitHub mode keeps only learnings on disk, so the backlog directory gets learnings/ and
// its index and nothing else; tasks, ideas and reports live in the repository's issues.
export async function setupGithub(
  root: string,
  input: SetupGithubInput,
  gh: GhRunner,
): Promise<SetupGithubResult> {
  try {
    await gh(["auth", "status"]);
  } catch (err) {
    if (err instanceof GhAuthError) throw err;
    throw new GhAuthError(err instanceof Error ? err.message : String(err));
  }

  const view = await ghJson<{ nameWithOwner?: string }>(gh, [
    "repo", "view", input.repo, "--json", "nameWithOwner",
  ]);
  if (view.nameWithOwner !== input.repo) {
    throw new GhRepoError(input.repo, `gh resolved it to "${String(view.nameWithOwner)}"`);
  }

  for (const label of FLOWSTATE_LABELS) {
    await gh([
      "label", "create", label.name, "--repo", input.repo, "--force",
      "--color", label.color, "--description", label.description,
    ]);
  }

  const learningsDir = join(root, "learnings");
  await ensureDir(learningsDir);
  await writeFile(join(learningsDir, ".gitkeep"), "", { flag: "wx" }).catch((err: NodeJS.ErrnoException) => {
    if (err.code !== "EEXIST") throw err;
  });
  await writeFile(learningsIndexPath(root), LEARNINGS_INDEX_TEMPLATE(input.projectName), { flag: "wx" }).catch(
    (err: NodeJS.ErrnoException) => {
      if (err.code !== "EEXIST") throw err;
    },
  );

  return { root, repo: input.repo, labels: FLOWSTATE_LABELS.map((l) => l.name) };
}
