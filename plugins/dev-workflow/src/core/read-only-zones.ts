import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { ReadOnlyZonesConfigError } from "./errors.js";

export const ZONES_CONFIG_PATH = ".claude/read-only-zones.json";

export type Zone = {
  readonly glob: string;
  readonly why: string;
};

export type ZoneCheck =
  | { readonly blocked: true; readonly relativePath: string; readonly zone: Zone }
  | { readonly blocked: false; readonly reason: "no-root" | "outside-project" | "no-match" };

export type HookOutcome = {
  readonly exitCode: 0 | 2;
  readonly message: string | null;
};

// macOS and Windows file systems fold case by default, so `DIST/a.js` is `dist/a.js`.
const FOLDS_CASE = process.platform === "darwin" || process.platform === "win32";

// The config file guards itself: a session that could edit it could lift any zone.
const IMPLICIT_ZONE: Zone = {
  glob: ZONES_CONFIG_PATH,
  why: "the read-only zones config is edited by hand, never by the agent",
};

// Converts one glob to a RegExp over a root-relative posix path. `**` crosses
// directories, `*` and `?` stay within one segment, `{a,b}` lists alternatives
// and `[...]` is a character class (`[!a]` negates, as in gitignore). A trailing
// `/` names a directory and matches everything below it.
export function globToRegExp(pattern: string): RegExp {
  const glob = pattern.endsWith("/") ? `${pattern}**` : pattern;
  let out = "";
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i]!;
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        const followedBySlash = glob[i + 2] === "/";
        out += followedBySlash ? "(?:.*/)?" : ".*";
        i += followedBySlash ? 3 : 2;
      } else {
        out += "[^/]*";
        i++;
      }
      continue;
    }
    if (ch === "?") {
      out += "[^/]";
    } else if (ch === "{") {
      const end = glob.indexOf("}", i);
      if (end === -1) {
        out += "\\{";
      } else {
        const alternatives = glob
          .slice(i + 1, end)
          .split(",")
          .map((part) => globToRegExp(part).source.slice(1, -1));
        out += `(?:${alternatives.join("|")})`;
        i = end + 1;
        continue;
      }
    } else if (ch === "[") {
      const end = glob.indexOf("]", i);
      if (end === -1) {
        out += "\\[";
      } else {
        const body = glob.slice(i + 1, end);
        out += `[${body.startsWith("!") ? `^${body.slice(1)}` : body}]`;
        i = end + 1;
        continue;
      }
    } else {
      out += ch.replace(/[.+^$()|\\]/g, "\\$&");
    }
    i++;
  }
  return new RegExp(`^${out}$`, FOLDS_CASE ? "i" : "");
}

export function parseZonesConfig(raw: string, configPath: string): readonly Zone[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ReadOnlyZonesConfigError(configPath, `invalid JSON (${detail})`);
  }
  if (!Array.isArray(parsed)) {
    throw new ReadOnlyZonesConfigError(configPath, "expected a JSON array of { glob, why } entries");
  }
  return parsed.map((entry: unknown, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new ReadOnlyZonesConfigError(configPath, `entry ${index} is not an object`);
    }
    const { glob, why } = entry as Record<string, unknown>;
    if (typeof glob !== "string" || glob.length === 0) {
      throw new ReadOnlyZonesConfigError(configPath, `entry ${index} needs a non-empty "glob" string`);
    }
    if (typeof why !== "string" || why.trim().length === 0) {
      throw new ReadOnlyZonesConfigError(
        configPath,
        `entry ${index} ("${glob}") needs a non-empty "why" string`,
      );
    }
    return { glob, why };
  });
}

// Returns null when the project has no config, so repos that never adopted the
// guard pay nothing. Any other failure is a broken config and throws.
export function loadZonesConfig(projectDir: string): readonly Zone[] | null {
  const configPath = join(projectDir, ZONES_CONFIG_PATH);
  if (!existsSync(configPath)) return null;
  let raw: string;
  try {
    raw = readFileSync(configPath, "utf8");
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ReadOnlyZonesConfigError(configPath, `cannot read it (${detail})`);
  }
  return [...parseZonesConfig(raw, configPath), IMPLICIT_ZONE];
}

// Nearest ancestor holding a `.git` entry: a directory in the main checkout,
// a file in a linked worktree. No git spawn, so the hook stays fast.
export function findGitRoot(startDir: string): string | null {
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function isInside(parent: string, child: string): boolean {
  const fold = (p: string): string => (FOLDS_CASE ? p.toLowerCase() : p);
  const rel = relative(fold(parent), fold(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

// Resolves symlinks through the nearest existing ancestor, so a target under
// `/var` and a project under `/private/var` (macOS temp dirs) still compare,
// and a symlink into a zone is checked at its real location.
function canonical(path: string): string {
  let existing = resolve(path);
  const rest: string[] = [];
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) return resolve(path);
    rest.unshift(existing.slice(parent.length + 1));
    existing = parent;
  }
  return join(realpathSync(existing), ...rest);
}

// A linked worktree belongs to the project when its `.git` file points into
// the project's own `.git/worktrees/`. A submodule's `.git` file points into
// `.git/modules/` instead, so it is a nested repository, not a checkout.
function worktreeBelongsToProject(gitRoot: string, projectDir: string): boolean {
  const gitEntry = join(gitRoot, ".git");
  try {
    if (!statSync(gitEntry).isFile()) return false;
    const pointer = readFileSync(gitEntry, "utf8").match(/^gitdir:\s*(.+)$/m)?.[1]?.trim();
    if (!pointer) return false;
    return isInside(join(projectDir, ".git", "worktrees"), canonical(resolve(gitRoot, pointer)));
  } catch {
    // An unreadable `.git` file is not a worktree of this project; the
    // outside-project path then allows the edit, which is the safe default.
    return false;
  }
}

// The directory zone globs are relative to. The repository root when the
// session started at it (or holds linked worktrees); the session directory
// itself when Claude was opened in a subdirectory of a larger repository, so
// `dist/**` in `packages/app/.claude/read-only-zones.json` means
// `packages/app/dist/`. Anything else is another project and is allowed.
function matchRoot(gitRoot: string, projectDir: string, target: string): string | null {
  if (isInside(projectDir, gitRoot) || worktreeBelongsToProject(gitRoot, projectDir)) return gitRoot;
  if (isInside(gitRoot, projectDir) && isInside(projectDir, target)) return projectDir;
  return null;
}

// A nested repository or submodule under the session directory is part of the
// project, so its files match relative to the project's own root. Walks out of
// every such repository; a linked worktree of the project keeps its own root.
function outerRoot(gitRoot: string, projectDir: string): string {
  let root = gitRoot;
  while (root !== projectDir && isInside(projectDir, root) && !worktreeBelongsToProject(root, projectDir)) {
    root = findGitRoot(dirname(root)) ?? projectDir;
  }
  return root;
}

export function checkTarget(input: {
  readonly projectDir: string;
  readonly zones: readonly Zone[];
  readonly targetPath: string;
}): ZoneCheck {
  const projectDir = canonical(input.projectDir);
  const target = canonical(input.targetPath);
  const gitRoot = findGitRoot(dirname(target));
  if (gitRoot === null) return { blocked: false, reason: "no-root" };
  const root = matchRoot(outerRoot(gitRoot, projectDir), projectDir, target);
  if (root === null) return { blocked: false, reason: "outside-project" };
  const relativePath = relative(root, target).split(sep).join("/");
  const zone = input.zones.find((candidate) => globToRegExp(candidate.glob).test(relativePath));
  return zone ? { blocked: true, relativePath, zone } : { blocked: false, reason: "no-match" };
}

function targetFromToolInput(toolInput: unknown): string | null {
  if (typeof toolInput !== "object" || toolInput === null) return null;
  const { file_path: filePath, notebook_path: notebookPath } = toolInput as Record<string, unknown>;
  if (typeof filePath === "string" && filePath.length > 0) return filePath;
  if (typeof notebookPath === "string" && notebookPath.length > 0) return notebookPath;
  return null;
}

// The whole hook as a pure function: exit 0 lets the tool run, exit 2 blocks
// it and `message` goes to stderr, which Claude sees as the denial reason.
// Stdin is read only once a config exists, so repos without one never wait.
export async function runReadOnlyZonesHook(input: {
  readonly projectDir: string | undefined;
  readonly readStdin: () => Promise<string>;
}): Promise<HookOutcome> {
  if (!input.projectDir) return { exitCode: 0, message: null };
  const configPath = join(input.projectDir, ZONES_CONFIG_PATH);
  let zones: readonly Zone[] | null;
  try {
    zones = loadZonesConfig(input.projectDir);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { exitCode: 2, message };
  }
  if (zones === null) return { exitCode: 0, message: null };

  let event: unknown;
  try {
    event = JSON.parse(await input.readStdin());
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      exitCode: 2,
      message: `read-only-zones: cannot parse the hook input (${detail}); edit blocked because ${configPath} declares zones.`,
    };
  }
  const { tool_input: toolInput, cwd } = (event ?? {}) as Record<string, unknown>;
  const rawTarget = targetFromToolInput(toolInput);
  if (rawTarget === null) return { exitCode: 0, message: null };
  const base = typeof cwd === "string" && cwd.length > 0 ? cwd : process.cwd();
  const result = checkTarget({
    projectDir: input.projectDir,
    zones,
    targetPath: isAbsolute(rawTarget) ? rawTarget : resolve(base, rawTarget),
  });
  if (!result.blocked) return { exitCode: 0, message: null };
  return {
    exitCode: 2,
    message: [
      `read-only zone: ${result.relativePath} matches "${result.zone.glob}" in ${configPath}.`,
      `Why: ${result.zone.why}`,
      "Leave this file as it is, or ask the user to change the zone by hand.",
    ].join("\n"),
  };
}
