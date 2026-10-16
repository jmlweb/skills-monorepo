import { appendFile, mkdir, readFile } from "node:fs/promises";
import { existsSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { RegistryReadError } from "./errors.js";
import { learningsDir, SHARED_LEARNINGS_ENV } from "./paths.js";

type Env = Readonly<Record<string, string | undefined>>;

export type LearningScope = "local" | "all";

// `label` names where a learning came from: "local" for this backlog, else the project name.
export interface LearningSource {
  readonly root: string;
  readonly label: string;
}

export interface SkippedSource {
  readonly path: string;
  readonly reason: string;
}

export interface SharedBacklogs {
  readonly sources: readonly LearningSource[];
  readonly skipped: readonly SkippedSource[];
}

export function isSharedEnabled(env: Env = process.env): boolean {
  return env[SHARED_LEARNINGS_ENV] !== "off";
}

export function registryPath(env: Env = process.env): string {
  const xdgConfig = env["XDG_CONFIG_HOME"];
  const configHome =
    xdgConfig !== undefined && xdgConfig !== ""
      ? xdgConfig
      : join(env["HOME"] ?? homedir(), ".config");
  return join(configHome, "flowstate", "backlogs");
}

// realpath folds /var and /private/var (macOS temp dirs) into one backlog identity.
export function canonicalBacklogPath(dir: string): string {
  const absolute = resolve(dir);
  return existsSync(absolute) ? realpathSync(absolute) : absolute;
}

export async function readRegistry(env: Env = process.env): Promise<string[]> {
  const file = registryPath(env);
  let content: string;
  try {
    content = await readFile(file, "utf-8");
  } catch (error) {
    // No registry yet means no backlog has registered; any other failure must surface.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new RegistryReadError(file, error);
  }
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

export async function registerBacklog(
  dir: string,
  env: Env = process.env,
): Promise<void> {
  const entry = canonicalBacklogPath(dir);
  if ((await readRegistry(env)).includes(entry)) return;
  const file = registryPath(env);
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, `${entry}\n`, "utf-8");
}

// Entries are skipped with a reason, never pruned: an unmounted disk keeps its entry.
export async function resolveSharedBacklogs(
  root: string,
  env: Env = process.env,
): Promise<SharedBacklogs> {
  if (!isSharedEnabled(env)) return { sources: [], skipped: [] };

  const seen = new Set<string>([canonicalBacklogPath(root)]);
  const sources: LearningSource[] = [];
  const skipped: SkippedSource[] = [];

  for (const path of await readRegistry(env)) {
    // A relative path would resolve against the caller's cwd, which is not stable.
    if (!isAbsolute(path)) {
      skipped.push({ path, reason: "relative path in registry" });
      continue;
    }

    const dir = canonicalBacklogPath(path);
    if (seen.has(dir)) continue;
    seen.add(dir);

    if (!existsSync(dir)) {
      skipped.push({ path, reason: "missing" });
      continue;
    }
    const lDir = learningsDir(dir);
    if (!existsSync(lDir) || !statSync(lDir).isDirectory()) {
      skipped.push({ path, reason: "no learnings/ dir" });
      continue;
    }

    sources.push({ root: dir, label: labelFor(dir) });
  }

  return { sources, skipped };
}

// Local first, so callers that rank with a stable sort keep local learnings ahead on ties.
export function learningSources(
  root: string,
  scope: LearningScope,
  shared: readonly LearningSource[],
): LearningSource[] {
  const local: LearningSource = { root, label: "local" };
  return scope === "local" ? [local] : [local, ...shared];
}

function labelFor(dir: string): string {
  return basename(dir) === ".backlog" ? basename(dirname(dir)) : basename(dir);
}
