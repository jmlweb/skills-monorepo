import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  canonicalBacklogPath,
  isSharedEnabled,
  learningSources,
  readRegistry,
  registerBacklog,
  registryPath,
  resolveSharedBacklogs,
} from "./registry.js";
import { RegistryReadError } from "./errors.js";
import { setup } from "../commands/setup.js";

let tmp: string;
let configHome: string;
let env: Record<string, string>;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-registry-"));
  configHome = join(tmp, "config");
  env = { XDG_CONFIG_HOME: configHome };
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

async function makeBacklog(name: string): Promise<string> {
  const root = join(tmp, name, ".backlog");
  await setup(root, name);
  return root;
}

describe("registryPath", () => {
  it("uses XDG_CONFIG_HOME when set", () => {
    expect(registryPath({ XDG_CONFIG_HOME: "/xdg" })).toBe(
      "/xdg/flowstate/backlogs",
    );
  });

  it("falls back to ~/.config when XDG_CONFIG_HOME is unset or empty", () => {
    expect(registryPath({ HOME: "/home/me" })).toBe(
      "/home/me/.config/flowstate/backlogs",
    );
    expect(registryPath({ XDG_CONFIG_HOME: "", HOME: "/home/me" })).toBe(
      "/home/me/.config/flowstate/backlogs",
    );
  });
});

describe("readRegistry", () => {
  it("returns an empty list when no registry file exists", async () => {
    expect(await readRegistry(env)).toEqual([]);
  });

  it("returns one trimmed entry per non-empty line", async () => {
    await mkdir(join(configHome, "flowstate"), { recursive: true });
    await writeFile(
      join(configHome, "flowstate", "backlogs"),
      "/a/.backlog\n\n  /b/.backlog  \n",
    );
    expect(await readRegistry(env)).toEqual(["/a/.backlog", "/b/.backlog"]);
  });

  it("throws a typed error when the registry is unreadable", async () => {
    // A directory where the file should be cannot be read as text.
    await mkdir(join(configHome, "flowstate", "backlogs"), { recursive: true });
    await expect(readRegistry(env)).rejects.toBeInstanceOf(RegistryReadError);
  });
});

describe("registerBacklog", () => {
  it("creates the registry and its parent directory", async () => {
    const root = await makeBacklog("alpha");
    await registerBacklog(root, env);
    const content = await readFile(registryPath(env), "utf-8");
    expect(content).toBe(`${canonicalBacklogPath(root)}\n`);
  });

  it("is idempotent", async () => {
    const root = await makeBacklog("alpha");
    await registerBacklog(root, env);
    await registerBacklog(root, env);
    expect(await readRegistry(env)).toEqual([canonicalBacklogPath(root)]);
  });

  it("stores the canonical path, so a symlinked alias registers once", async () => {
    const root = await makeBacklog("alpha");
    const alias = join(tmp, "alias");
    const { symlink } = await import("node:fs/promises");
    await symlink(join(tmp, "alpha"), alias);
    await registerBacklog(root, env);
    await registerBacklog(join(alias, ".backlog"), env);
    expect(await readRegistry(env)).toHaveLength(1);
  });
});

describe("isSharedEnabled", () => {
  it("is on unless FLOWSTATE_SHARED is exactly off", () => {
    expect(isSharedEnabled({})).toBe(true);
    expect(isSharedEnabled({ FLOWSTATE_SHARED: "on" })).toBe(true);
    expect(isSharedEnabled({ FLOWSTATE_SHARED: "" })).toBe(true);
    expect(isSharedEnabled({ FLOWSTATE_SHARED: "off" })).toBe(false);
  });
});

describe("resolveSharedBacklogs", () => {
  it("excludes the current backlog and labels others by owning project", async () => {
    const current = await makeBacklog("current");
    const other = await makeBacklog("other-project");
    await registerBacklog(current, env);
    await registerBacklog(other, env);

    const { sources, skipped } = await resolveSharedBacklogs(current, env);
    expect(skipped).toEqual([]);
    expect(sources).toEqual([
      { root: canonicalBacklogPath(other), label: "other-project" },
    ]);
  });

  it("does not match the current backlog through a /var vs /private/var alias", async () => {
    // macOS temp dirs are symlinks; the registry must not list the caller twice.
    const current = await makeBacklog("aliased");
    await registerBacklog(current, env);
    const { sources } = await resolveSharedBacklogs(current, env);
    expect(sources).toEqual([]);
  });

  it("skips a missing entry with a reason and keeps it in the registry", async () => {
    const current = await makeBacklog("current");
    const gone = join(tmp, "unmounted", ".backlog");
    await mkdir(join(configHome, "flowstate"), { recursive: true });
    await writeFile(registryPath(env), `${gone}\n`);

    const { sources, skipped } = await resolveSharedBacklogs(current, env);
    expect(sources).toEqual([]);
    expect(skipped).toEqual([{ path: gone, reason: "missing" }]);
    expect(await readRegistry(env)).toEqual([gone]);
  });

  it("skips an entry without a learnings/ dir", async () => {
    const current = await makeBacklog("current");
    const bare = join(tmp, "bare", ".backlog");
    await mkdir(bare, { recursive: true });
    await registerBacklog(bare, env);

    const { sources, skipped } = await resolveSharedBacklogs(current, env);
    expect(sources).toEqual([]);
    expect(skipped).toEqual([
      { path: canonicalBacklogPath(bare), reason: "no learnings/ dir" },
    ]);
  });

  it("skips a relative registry entry instead of resolving it against cwd", async () => {
    const current = await makeBacklog("current");
    await mkdir(join(configHome, "flowstate"), { recursive: true });
    await writeFile(registryPath(env), "relative/.backlog\n");

    const { sources, skipped } = await resolveSharedBacklogs(current, env);
    expect(sources).toEqual([]);
    expect(skipped).toEqual([
      { path: "relative/.backlog", reason: "relative path in registry" },
    ]);
  });

  it("dedupes repeated registry entries", async () => {
    const current = await makeBacklog("current");
    const other = await makeBacklog("other");
    await mkdir(join(configHome, "flowstate"), { recursive: true });
    await writeFile(registryPath(env), `${other}\n${other}\n`);

    const { sources } = await resolveSharedBacklogs(current, env);
    expect(sources).toHaveLength(1);
  });

  it("returns nothing when FLOWSTATE_SHARED=off", async () => {
    const current = await makeBacklog("current");
    const other = await makeBacklog("other");
    await registerBacklog(other, env);

    const result = await resolveSharedBacklogs(current, {
      ...env,
      FLOWSTATE_SHARED: "off",
    });
    expect(result).toEqual({ sources: [], skipped: [] });
  });
});

describe("learningSources", () => {
  const shared = [{ root: "/other/.backlog", label: "other" }];

  it("puts local first and appends shared for scope all", () => {
    expect(learningSources("/me/.backlog", "all", shared)).toEqual([
      { root: "/me/.backlog", label: "local" },
      ...shared,
    ]);
  });

  it("returns only local for scope local", () => {
    expect(learningSources("/me/.backlog", "local", shared)).toEqual([
      { root: "/me/.backlog", label: "local" },
    ]);
  });
});
