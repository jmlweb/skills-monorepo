import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const CLI = join(import.meta.dirname, "../../dist/bin/flowstate.js");
let tmp: string;

function run(
  ...args: string[]
): string {
  return execFileSync("node", [CLI, ...args], {
    cwd: tmp,
    encoding: "utf-8",
    timeout: 10000,
  }).trim();
}

function runJson(...args: string[]): unknown {
  const out = run(...args, "--json", "true");
  return JSON.parse(out);
}

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-int-"));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("CLI integration", () => {
  it("setup creates .backlog structure", () => {
    run("setup", "--project-name", "IntTest");
    const result = runJson("stats") as Record<string, number>;
    expect(result).toEqual({ pending: 0, active: 0, blocked: 0, complete: 0, pendingIdeas: 0, pendingReports: 0, learnings: 0 });
  });

  it("full task lifecycle: create -> start -> complete", () => {
    run("setup", "--project-name", "IntTest");

    const created = runJson(
      "task-create",
      "--title", "Integration test task",
      "--priority", "P2",
      "--tags", "test,integration",
      "--description", "Testing the CLI",
      "--criteria", '["It works","No errors"]',
    ) as { id: string; path: string };

    expect(created.id).toBe("TSK-001");

    // Start
    run("task-move", "TSK-001", "--to", "active");

    // Check stats
    const afterStart = runJson("stats") as Record<string, number>;
    expect(afterStart).toEqual({ pending: 0, active: 1, blocked: 0, complete: 0, pendingIdeas: 0, pendingReports: 0, learnings: 0 });

    // Complete
    run("task-move", "TSK-001", "--to", "complete");

    const afterComplete = runJson("stats") as Record<string, number>;
    expect(afterComplete).toEqual({ pending: 0, active: 0, blocked: 0, complete: 1, pendingIdeas: 0, pendingReports: 0, learnings: 0 });
  });

  it("task-list returns items", () => {
    run("setup", "--project-name", "IntTest");
    run("task-create", "--title", "A", "--priority", "P1", "--description", "test");
    run("task-create", "--title", "B", "--priority", "P3", "--description", "test");

    const list = runJson("task-list") as unknown[];
    expect(list).toHaveLength(2);
  });

  it("next-id returns correct ID", () => {
    run("setup", "--project-name", "IntTest");
    const result = runJson("next-id", "task") as { id: string };
    expect(result.id).toBe("TSK-001");

    run("task-create", "--title", "A", "--priority", "P2", "--description", "");
    const result2 = runJson("next-id", "task") as { id: string };
    expect(result2.id).toBe("TSK-002");
  });

  it("idea lifecycle: create -> approve", () => {
    run("setup", "--project-name", "IntTest");

    const idea = runJson(
      "idea-create",
      "--title", "Refactor auth",
      "--complexity", "high",
      "--body", "The idea body",
    ) as { id: string };

    expect(idea.id).toBe("PLN-001");

    run("idea-move", "PLN-001", "--status", "approved", "--task-id", "TSK-001");

    // Verify moved to complete
    const entries = execFileSync("ls", [join(tmp, ".backlog/ideas/complete")], {
      encoding: "utf-8",
    }).trim();
    expect(entries).toContain("PLN-001");
  });

  it("report lifecycle: create -> triage", () => {
    run("setup", "--project-name", "IntTest");

    const report = runJson(
      "report-create",
      "--title", "Auth bug",
      "--type", "bug",
      "--severity", "high",
      "--body", "Details here",
    ) as { id: string };

    expect(report.id).toBe("RPT-001");

    run("report-move", "RPT-001", "--status", "triaged", "--task-id", "TSK-001");
  });

  it("learning-create creates directory", () => {
    run("setup", "--project-name", "IntTest");

    const learning = runJson(
      "learning-create",
      "--title", "Always test first",
      "--tags", "tdd,testing",
      "--body", "Content here",
    ) as { id: string };

    expect(learning.id).toBe("LRN-001");
  });

  it("index-rebuild regenerates index", () => {
    run("setup", "--project-name", "IntTest");
    run("task-create", "--title", "A", "--priority", "P1", "--description", "test");
    run("task-create", "--title", "B", "--priority", "P2", "--description", "test");
    run("task-move", "TSK-001", "--to", "active");

    run("index-rebuild", "--type", "tasks");

    const index = execFileSync(
      "cat",
      [join(tmp, ".backlog/tasks/index.md")],
      { encoding: "utf-8" },
    );
    expect(index).toContain("| Pending | 1 |");
    expect(index).toContain("| Active | 1 |");
  });

  it("resolves .backlog/ when running from a subdirectory", async () => {
    run("setup", "--project-name", "IntTest");
    run("task-create", "--title", "SubdirTask", "--priority", "P1", "--description", "test");

    const sub = join(tmp, "apps", "core", "src");
    await mkdir(sub, { recursive: true });

    const result = execFileSync("node", [CLI, "task-list", "--json", "true"], {
      cwd: sub,
      encoding: "utf-8",
      timeout: 10000,
    }).trim();

    const items = JSON.parse(result) as unknown[];
    expect(items).toHaveLength(1);
  });

  it("rejects an invalid entity type for next-id", () => {
    run("setup", "--project-name", "IntTest");
    try {
      execFileSync("node", [CLI, "next-id", "bogus"], {
        cwd: tmp,
        encoding: "utf-8",
        timeout: 10000,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      const error = err as { status: number; stderr: string };
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toMatch(/task.*idea.*report.*learning/i);
    }
  });

  it("rejects an invalid status for task-list", () => {
    run("setup", "--project-name", "IntTest");
    try {
      execFileSync("node", [CLI, "task-list", "--status", "foo"], {
        cwd: tmp,
        encoding: "utf-8",
        timeout: 10000,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      const error = err as { status: number; stderr: string };
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toMatch(/Invalid.*status/i);
    }
  });

  it("learning-search --similar-to is an alias for --query (dedupe use case)", () => {
    run("setup", "--project-name", "IntTest");
    runJson("learning-create", "--title", "Redis quirk in docker", "--tags", "redis,docker", "--body", "Redis needs explicit image name.");
    runJson("learning-create", "--title", "Postgres tuning", "--tags", "postgres", "--body", "Different topic.");

    const viaQuery = runJson("learning-search", "--query", "redis quirk", "--limit", "5") as { id: string }[];
    const viaSimilarTo = runJson("learning-search", "--similar-to", "redis quirk", "--limit", "5") as { id: string }[];

    expect(viaSimilarTo).toEqual(viaQuery);
    expect(viaSimilarTo).toHaveLength(1);
    expect(viaSimilarTo[0]!.id).toBe("LRN-001");
  });

  it("idea-list lists pending ideas and supports --status filter", () => {
    run("setup", "--project-name", "IntTest");
    runJson("idea-create", "--title", "First idea", "--complexity", "low", "--body", "test");
    runJson("idea-create", "--title", "Second idea", "--complexity", "medium", "--body", "test");
    run("idea-move", "PLN-002", "--status", "approved", "--task-id", "TSK-001");

    const pending = runJson("idea-list") as { id: string }[];
    expect(pending).toHaveLength(1);
    expect(pending[0]!.id).toBe("PLN-001");

    const all = runJson("idea-list", "--status", "all") as unknown[];
    expect(all).toHaveLength(2);

    const complete = runJson("idea-list", "--status", "complete") as { id: string; status: string }[];
    expect(complete).toHaveLength(1);
    expect(complete[0]!.id).toBe("PLN-002");
    expect(complete[0]!.status).toBe("approved");
  });

  it("learning-list filters archived by default and supports --status / --include-archived", async () => {
    run("setup", "--project-name", "IntTest");
    runJson("learning-create", "--title", "Active one", "--tags", "x", "--body", "active");
    runJson("learning-create", "--title", "Old one", "--tags", "y", "--body", "old");
    run("learning-move", "LRN-002", "--to", "archived");

    const defaultList = runJson("learning-list") as unknown[];
    expect(defaultList).toHaveLength(1);

    const includeArchived = runJson("learning-list", "--include-archived", "true") as unknown[];
    expect(includeArchived).toHaveLength(2);

    const statusAll = runJson("learning-list", "--status", "all") as unknown[];
    expect(statusAll).toHaveLength(2);

    const statusArchived = runJson("learning-list", "--status", "archived") as { id: string }[];
    expect(statusArchived).toHaveLength(1);
    expect(statusArchived[0]!.id).toBe("LRN-002");

    try {
      execFileSync("node", [CLI, "learning-list", "--status", "bogus"], {
        cwd: tmp,
        encoding: "utf-8",
        timeout: 10000,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      const error = err as { status: number; stderr: string };
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toMatch(/Invalid --status/);
    }
  });

  it("--help prints top-level usage and exits 0 without needing a backlog", async () => {
    const isolated = await mkdtemp(join(tmpdir(), "flowstate-help-"));
    try {
      const out = execFileSync("node", [CLI, "--help"], {
        cwd: isolated,
        encoding: "utf-8",
        timeout: 10000,
      });
      expect(out).toMatch(/Usage: flowstate <command>/);
      expect(out).toMatch(/task-create/);
      expect(out).toMatch(/learning-search/);
    } finally {
      await rm(isolated, { recursive: true, force: true });
    }
  });

  it("-h is an alias for --help", async () => {
    const isolated = await mkdtemp(join(tmpdir(), "flowstate-help-"));
    try {
      const out = execFileSync("node", [CLI, "-h"], {
        cwd: isolated,
        encoding: "utf-8",
        timeout: 10000,
      });
      expect(out).toMatch(/Usage: flowstate <command>/);
    } finally {
      await rm(isolated, { recursive: true, force: true });
    }
  });

  it("subcommand --help prints command usage and exits 0", async () => {
    const isolated = await mkdtemp(join(tmpdir(), "flowstate-help-"));
    try {
      const out = execFileSync("node", [CLI, "task-create", "--help"], {
        cwd: isolated,
        encoding: "utf-8",
        timeout: 10000,
      });
      expect(out).toMatch(/Usage: flowstate task-create/);
      expect(out).toMatch(/--priority/);
    } finally {
      await rm(isolated, { recursive: true, force: true });
    }
  });

  it("subcommand -h is an alias for --help", async () => {
    const isolated = await mkdtemp(join(tmpdir(), "flowstate-help-"));
    try {
      const out = execFileSync("node", [CLI, "task-list", "-h"], {
        cwd: isolated,
        encoding: "utf-8",
        timeout: 10000,
      });
      expect(out).toMatch(/Usage: flowstate task-list/);
    } finally {
      await rm(isolated, { recursive: true, force: true });
    }
  });

  it("--help on unknown command exits 1 with a hint", async () => {
    const isolated = await mkdtemp(join(tmpdir(), "flowstate-help-"));
    try {
      execFileSync("node", [CLI, "bogus", "--help"], {
        cwd: isolated,
        encoding: "utf-8",
        timeout: 10000,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      const error = err as { status: number; stderr: string };
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toMatch(/Unknown command: bogus/);
      expect(error.stderr.toString()).toMatch(/Usage: flowstate <command>/);
    } finally {
      await rm(isolated, { recursive: true, force: true });
    }
  });

  it("exits with error when no .backlog/ exists in any ancestor", async () => {
    const isolated = await mkdtemp(join(tmpdir(), "flowstate-no-backlog-"));
    try {
      execFileSync("node", [CLI, "task-list", "--json", "true"], {
        cwd: isolated,
        encoding: "utf-8",
        timeout: 10000,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      const error = err as { status: number; stderr: string };
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toMatch(/No \.backlog\/ directory found/);
    } finally {
      await rm(isolated, { recursive: true, force: true });
    }
  });
});
