import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { mkdtemp, mkdir, readdir, realpath, rm } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { openStubGh, type StubGh } from "../core/github-stub.test-support.js";

// Spawns the compiled CLI in GitHub mode against scripts/gh-stub.mjs on PATH. Build first.
const CLI = join(import.meta.dirname, "../../dist/bin/flowstate.js");

// Every spawn inherits this, so no test writes to the developer's real shared registry (LRN-035).
const xdgConfigHome = mkdtempSync(join(tmpdir(), "flowstate-xdg-"));
afterAll(async () => {
  await rm(xdgConfigHome, { recursive: true, force: true });
});

let tmp: string;
let stub: StubGh;

beforeEach(async () => {
  // macOS temp dirs alias /var and /private/var; the CLI prints the real path (LRN-036).
  tmp = await realpath(await mkdtemp(join(tmpdir(), "flowstate-gh-int-")));
  stub = await openStubGh({ labels: [] });
});

afterEach(async () => {
  await stub.close();
  await rm(tmp, { recursive: true, force: true });
});

function env(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const { FLOWSTATE_BACKLOG_DIR: _ignored, ...rest } = stub.env;
  return {
    ...rest,
    XDG_CONFIG_HOME: xdgConfigHome,
    FLOWSTATE_BACKEND: "github",
    FLOWSTATE_GITHUB_REPO: stub.repo,
    ...extra,
  };
}

function run(...args: string[]): string {
  return execFileSync("node", [CLI, ...args], { cwd: tmp, encoding: "utf-8", timeout: 20000, env: env() }).trim();
}

const runJson = (...args: string[]): unknown => JSON.parse(run(...args, "--json", "true"));

function runFails(args: string[], extra: Record<string, string> = {}): { status: number | null; stderr: string } {
  const result = spawnSync("node", [CLI, ...args], { cwd: tmp, encoding: "utf-8", timeout: 20000, env: env(extra) });
  return { status: result.status, stderr: result.stderr };
}

describe("CLI integration in GitHub mode", () => {
  it("setup --github creates labels, only learnings/ on disk, and prints the settings snippet", async () => {
    const out = runJson("setup", "--github", "--project-name", "Widgets") as Record<string, unknown>;
    expect(out["backend"]).toBe("github");
    expect(out["repo"]).toBe(stub.repo);
    expect(out["root"]).toBe(join(tmp, ".backlog"));
    expect(out["settingsFile"]).toBe(".claude/settings.local.json");
    expect(JSON.parse(String(out["settingsSnippet"]))).toEqual({ env: { FLOWSTATE_BACKEND: "github" } });
    expect(await readdir(join(tmp, ".backlog"))).toEqual(["learnings"]);
    expect((await stub.readState()).labels).toHaveLength(12);
  });

  it("setup --github --repo pins the repository in the snippet and rejects a bad form", async () => {
    const out = runJson("setup", "--github", "--repo", stub.repo) as { settingsSnippet: string };
    expect(JSON.parse(out.settingsSnippet)).toEqual({ env: { FLOWSTATE_BACKEND: "github", FLOWSTATE_GITHUB_REPO: stub.repo } });

    const bad = runFails(["setup", "--github", "--repo", "widgets"]);
    expect(bad.status).toBe(1);
    expect(bad.stderr).toMatch(/owner\/name/);
    const noGithub = runFails(["setup", "--repo", stub.repo]);
    expect(noGithub.status).toBe(1);
    expect(noGithub.stderr).toMatch(/--repo only applies with --github/);
  });

  it("setup --github fails before writing when gh is logged out or the repo is wrong", async () => {
    await stub.writeState({ ...(await stub.readState()), auth: false });
    const loggedOut = runFails(["setup", "--github"]);
    expect(loggedOut.status).toBe(1);
    expect(loggedOut.stderr).toMatch(/gh auth login/);
    await expect(readdir(join(tmp, ".backlog"))).rejects.toThrow();

    await stub.writeState({ ...(await stub.readState()), auth: true });
    const wrongRepo = runFails(["setup", "--github", "--repo", "acme/nope"]);
    expect(wrongRepo.status).toBe(1);
    expect(wrongRepo.stderr).toMatch(/"acme\/nope" is not reachable/);
  });

  it("runs the task, idea and report lifecycle through issues", async () => {
    run("setup", "--github");

    const created = runJson("task-create", "--title", "Ship it", "--priority", "P1", "--tags", "api", "--description", "d", "--criteria", '["Works"]') as { id: string; path: string };
    expect(created).toEqual({ id: "TSK-001", path: `https://github.com/${stub.repo}/issues/1` });

    run("task-move", "TSK-001", "--to", "active");
    const active = runJson("task-list", "--status", "active") as { id: string; status: string; priority: string; tags: string[] }[];
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({ id: "TSK-001", status: "active", priority: "P1", tags: ["api"] });

    run("task-block", "TSK-001", "--reason", "waiting");
    expect((runJson("task-list", "--status", "blocked") as { id: string }[]).map((t) => t.id)).toEqual(["TSK-001"]);
    run("task-unblock", "TSK-001");
    run("task-update", "TSK-001", "--check", "1", "--log", "did it");
    expect(run("task-move", "TSK-001", "--to", "complete")).toContain(`path: https://github.com/${stub.repo}/issues/1`);

    const idea = runJson("idea-create", "--title", "Cache", "--complexity", "low", "--body", "## Goal") as { id: string };
    expect(idea.id).toBe("PLN-002");
    run("idea-move", "PLN-002", "--status", "approved", "--task-id", "TSK-001");
    const report = runJson("report-create", "--title", "Leak", "--type", "bug", "--severity", "high") as { id: string };
    expect(report.id).toBe("RPT-003");
    run("report-move", "RPT-003", "--status", "discarded");

    expect(runJson("stats")).toEqual({ pending: 0, active: 0, blocked: 0, complete: 1, pendingIdeas: 0, pendingReports: 0, learnings: 0 });
    expect((runJson("idea-list", "--status", "complete") as { id: string; status: string; taskId: string }[])[0]).toMatchObject({ id: "PLN-002", status: "approved", taskId: "TSK-001" });

    const state = await stub.readState();
    expect(state.issues.map((i) => [i.number, i.state, i.labels])).toEqual([
      [1, "CLOSED", ["flowstate:task", "P1", "api"]],
      [2, "CLOSED", ["flowstate:idea", "status:approved"]],
      [3, "CLOSED", ["flowstate:report", "status:discarded"]],
    ]);
    expect(state.issues[0]?.body).toContain("- [x] Works");
    expect(state.issues[0]?.body).toMatch(/^```flowstate\n[\s\S]*completed: \d{4}-\d{2}-\d{2}\n/);
  });

  it("path, next-id, index-rebuild and task-doctor say what GitHub mode does instead of no-op", async () => {
    run("setup", "--github");
    await mkdir(join(tmp, ".backlog"), { recursive: true });

    expect(run("path")).toBe(join(tmp, ".backlog"));
    expect(runJson("path")).toEqual({ path: join(tmp, ".backlog"), source: "walk-up", backend: "github", repo: stub.repo });

    expect(runJson("next-id", "learning")).toEqual({ id: "LRN-001" });
    const nextTask = runFails(["next-id", "task"]);
    expect(nextTask.status).toBe(1);
    expect(nextTask.stderr).toMatch(/not available in GitHub mode/);

    expect(runJson("index-rebuild", "--type", "tasks")).toEqual({ rebuilt: "none", skipped: "tasks: not applicable in GitHub mode (issues have no index.md)" });
    expect(runJson("index-rebuild")).toEqual({ rebuilt: "learnings", skipped: "tasks: not applicable in GitHub mode (issues have no index.md)" });
    expect(run("index-rebuild", "--type", "learnings")).toBe("rebuilt: learnings");

    expect(runJson("task-doctor")).toEqual({ scanned: 0, fixed: [], invalid: [] });
    const state = await stub.readState();
    state.issues.push({ number: 1, title: "orphan", body: "", labels: ["flowstate:idea"], state: "CLOSED" });
    state.nextNumber = 2;
    await stub.writeState(state);
    const doctor = runJson("task-doctor") as { invalid: { id: string; reason: string }[] };
    expect(doctor.invalid[0]?.id).toBe("#1");
    expect(doctor.invalid[0]?.reason).toMatch(/no final-state label/);
    expect(run("task-doctor")).toMatch(/^scanned: 1\nfixed: \ninvalid:\n#1\t/);
  });

  it("learnings stay on disk in GitHub mode", async () => {
    run("setup", "--github");
    const learning = runJson("learning-create", "--title", "Keep local", "--tags", "github", "--body", "Insight") as { id: string };
    expect(learning.id).toBe("LRN-001");
    expect(await readdir(join(tmp, ".backlog", "learnings"))).toContain("LRN-001-keep-local");
    expect((runJson("learning-list", "--scope", "local") as { id: string }[]).map((l) => l.id)).toEqual(["LRN-001"]);
    expect(runJson("stats")).toMatchObject({ learnings: 1 });
  });

  it("fails with the typed gh errors when gh is missing or logged out", async () => {
    run("setup", "--github");
    const emptyBin = await mkdtemp(join(tmpdir(), "flowstate-nogh-"));
    try {
      // node must stay reachable; only gh disappears.
      const missing = runFails(["task-list"], { PATH: `${emptyBin}:${dirname(process.execPath)}` });
      expect(missing.status).toBe(1);
      expect(missing.stderr).toMatch(/needs the gh CLI on PATH/);
    } finally {
      await rm(emptyBin, { recursive: true, force: true });
    }

    await stub.writeState({ ...(await stub.readState()), auth: false });
    const loggedOut = runFails(["task-list"], { FLOWSTATE_GITHUB_REPO: "" });
    expect(loggedOut.status).toBe(1);
    expect(loggedOut.stderr).toMatch(/gh auth login/);
  });
});
