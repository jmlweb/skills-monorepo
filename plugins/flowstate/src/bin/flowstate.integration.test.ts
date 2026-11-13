import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { mkdtemp, rm, readFile, readdir, mkdir, realpath, writeFile } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";

const CLI = join(import.meta.dirname, "../../dist/bin/flowstate.js");
let tmp: string;

// Every spawn inherits this, so no test writes to the developer's real shared registry.
const xdgConfigHome = mkdtempSync(join(tmpdir(), "flowstate-xdg-"));
process.env["XDG_CONFIG_HOME"] = xdgConfigHome;
afterAll(async () => {
  await rm(xdgConfigHome, { recursive: true, force: true });
});
// Each test's temp backlogs are gone afterwards; their registry entries would only warn.
afterEach(async () => {
  await rm(join(xdgConfigHome, "flowstate"), { recursive: true, force: true });
});

function run(
  ...args: string[]
): string {
  return execFileSync("node", [CLI, ...args], {
    cwd: tmp,
    encoding: "utf-8",
    timeout: 10000,
    env: cleanEnv(),
  }).trim();
}

// A developer's own FLOWSTATE_BACKLOG_DIR must not leak into these tests.
function cleanEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const { FLOWSTATE_BACKLOG_DIR: _ignored, ...rest } = process.env;
  return { ...rest, ...extra };
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

  it("task-update --log - reads stdin and --check ticks criteria", async () => {
    run("setup", "--project-name", "IntTest");
    const created = runJson(
      "task-create",
      "--title", "Log me",
      "--priority", "P2",
      "--description", "d",
      "--criteria", '["One","Two"]',
    ) as { path: string };

    execFileSync("node", [CLI, "task-update", "TSK-001", "--log", "-", "--check", "2"], {
      cwd: tmp,
      input: "Wired the parser\nNext: docs\n",
      encoding: "utf-8",
      timeout: 10000,
    });

    const content = await readFile(created.path, "utf-8");
    expect(content).toContain("- [ ] One\n- [x] Two");
    expect(content).toMatch(/\] Wired the parser\n- \[\d{4}-\d{2}-\d{2}\] Next: docs/);
  });

  it.each([
    ["a JSON string", '"one"'],
    ["an array with non-string items", '[1,{"a":2}]'],
    ["an array with an empty string", '["ok",""]'],
    ["invalid JSON", "[not json"],
  ])("task-create --criteria rejects %s with the expected format", async (_label, criteria) => {
    run("setup", "--project-name", "IntTest");
    const result = spawnSync(
      "node",
      [CLI, "task-create", "--title", "A", "--priority", "P1", "--criteria", criteria],
      { cwd: tmp, encoding: "utf-8", env: cleanEnv() },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Invalid --criteria value\. Use a JSON array of non-empty strings/);
    expect(result.stderr).not.toMatch(/map is not a function|Unexpected token/);
    expect(await readdir(join(tmp, ".backlog/tasks/pending"))).not.toContain(expect.stringMatching(/^TSK-/));
  });

  it("task-update --check rejects a non-numeric value", () => {
    run("setup", "--project-name", "IntTest");
    run("task-create", "--title", "A", "--priority", "P1", "--description", "test");
    expect(() => run("task-update", "TSK-001", "--check", "one")).toThrow(/Invalid --check value/);
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

  it("report-move rejects an unknown --status and leaves the report pending", async () => {
    run("setup", "--project-name", "IntTest");
    run("report-create", "--title", "Auth bug", "--type", "bug", "--severity", "high", "--body", "x");

    const result = spawnSync("node", [CLI, "report-move", "RPT-001", "--status", "bogus"], {
      cwd: tmp,
      encoding: "utf-8",
      env: cleanEnv(),
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Invalid --status value: "bogus".*triaged, discarded/);

    const pending = await readdir(join(tmp, ".backlog/reports/pending"));
    expect(pending.some((f) => f.startsWith("RPT-001-"))).toBe(true);
    const content = await readFile(join(tmp, ".backlog/reports/pending", pending.find((f) => f.startsWith("RPT-001-"))!), "utf-8");
    expect(content).toContain("status: pending");
    expect(await readdir(join(tmp, ".backlog/reports/complete"))).not.toContain(expect.stringMatching(/^RPT-001/));
  });

  it("idea-move rejects an unknown --status and leaves the idea pending", async () => {
    run("setup", "--project-name", "IntTest");
    run("idea-create", "--title", "Refactor auth", "--complexity", "low", "--body", "x");

    const result = spawnSync("node", [CLI, "idea-move", "PLN-001", "--status", "bogus"], {
      cwd: tmp,
      encoding: "utf-8",
      env: cleanEnv(),
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Invalid --status value: "bogus".*approved, discarded/);

    const pending = await readdir(join(tmp, ".backlog/ideas/pending"));
    const file = pending.find((f) => f.startsWith("PLN-001-"));
    expect(file).toBeDefined();
    expect(await readFile(join(tmp, ".backlog/ideas/pending", file!), "utf-8")).toContain("status: pending");
    expect(await readdir(join(tmp, ".backlog/ideas/complete"))).not.toContain(expect.stringMatching(/^PLN-001/));
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

  it("list commands print exactly one line per entity in plain mode", () => {
    run("setup", "--project-name", "IntTest");
    for (const n of ["One", "Two", "Three"]) {
      run("task-create", "--title", `Task ${n}`, "--priority", "P2", "--description", "line a\nline b");
      run("idea-create", "--title", `Idea ${n}`, "--complexity", "low", "--body", "line a\n\nline b\tTabbed");
      run("learning-create", "--title", `Learning ${n} redis`, "--tags", "redis", "--body", "line a\n\nline b\tTabbed");
    }
    const lines = (...args: string[]): string[] => run(...args).split("\n");

    expect(lines("task-list")).toHaveLength(3);
    expect(lines("idea-list")).toHaveLength(3);
    const learnings = lines("learning-list");
    expect(learnings).toHaveLength(3);
    expect(learnings[0]).toContain("line a\\n\\nline b\\tTabbed");
    expect(lines("learning-search", "--query", "redis")).toHaveLength(3);

    const json = runJson("learning-list") as { body: string }[];
    expect(json[0]!.body).toContain("line a\n\nline b");
  });

  it.each([
    ["task-create", ["--priority", "P2", "--description", "x"], ".backlog/tasks/pending"],
    ["idea-create", ["--complexity", "low", "--body", "x"], ".backlog/ideas/pending"],
    ["report-create", ["--type", "bug", "--severity", "low", "--body", "x"], ".backlog/reports/pending"],
    ["learning-create", ["--tags", "x", "--body", "x"], ".backlog/learnings"],
  ])("%s rejects a title holding a newline and writes nothing", async (command, extra, dir) => {
    run("setup", "--project-name", "IntTest");
    const result = spawnSync("node", [CLI, command, "--title", "Line one\nline two", ...extra], {
      cwd: tmp,
      encoding: "utf-8",
      env: cleanEnv(),
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Invalid title: it must be a single line/);
    expect((await readdir(join(tmp, dir))).filter((f) => /^(TSK|PLN|RPT|LRN)-/.test(f))).toEqual([]);
  });

  describe("flag values that are empty, blank or start with -- (RPT-014)", () => {
    const CREATES: readonly [string, readonly string[], string][] = [
      ["task-create", ["--priority", "P2", "--description", "x"], ".backlog/tasks/pending"],
      ["idea-create", ["--complexity", "low", "--body", "x"], ".backlog/ideas/pending"],
      ["report-create", ["--type", "bug", "--severity", "low", "--body", "x"], ".backlog/reports/pending"],
      ["learning-create", ["--tags", "x", "--body", "x"], ".backlog/learnings"],
    ];

    async function entityFiles(dir: string): Promise<string[]> {
      return (await readdir(join(tmp, dir))).filter((f) => /^(TSK|PLN|RPT|LRN)-/.test(f));
    }

    it.each(CREATES)("%s rejects --title \"\" and \"   \" and writes nothing", async (command, extra, dir) => {
      run("setup", "--project-name", "IntTest");
      for (const title of ["", "   "]) {
        const result = spawnSync("node", [CLI, command, "--title", title, ...extra], {
          cwd: tmp,
          encoding: "utf-8",
          env: cleanEnv(),
        });
        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/--title cannot be empty or whitespace-only/);
      }
      expect(await entityFiles(dir)).toEqual([]);
    });

    it.each(CREATES)("%s rejects a --title that starts with -- and writes nothing", async (command, extra, dir) => {
      run("setup", "--project-name", "IntTest");
      const result = spawnSync("node", [CLI, command, "--title", "--x", ...extra], {
        cwd: tmp,
        encoding: "utf-8",
        env: cleanEnv(),
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/Flag --title needs a value, but "--x" reads as the next flag/);
      expect(await entityFiles(dir)).toEqual([]);
    });

    it("task-update --log with a value starting with -- exits 1 and never logs true", async () => {
      run("setup", "--project-name", "IntTest");
      const created = runJson("task-create", "--title", "Log me", "--priority", "P2", "--description", "d") as { path: string };
      const before = await readFile(created.path, "utf-8");

      const result = spawnSync("node", [CLI, "task-update", "TSK-001", "--log", "--x"], {
        cwd: tmp,
        encoding: "utf-8",
        env: cleanEnv(),
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/Flag --log needs a value/);
      const after = await readFile(created.path, "utf-8");
      expect(after).toBe(before);
      expect(after).not.toMatch(/\] true$/m);
    });

    it("keeps bare switches working: task-condense --all, setup --private", () => {
      run("setup", "--project-name", "IntTest");
      expect(runJson("task-condense", "--all")).toEqual([]);
      execFileSync("git", ["init", "-q"], { cwd: tmp });
      const out = JSON.parse(run("setup", "--private", "--json", "true")) as { root: string };
      expect(out.root.endsWith(join(".git", "flowstate"))).toBe(true);
    });
  });

  describe("--limit (RPT-017)", () => {
    const LIST_COMMANDS = ["task-list", "idea-list", "report-list", "learning-search"] as const;

    it.each(LIST_COMMANDS)("%s rejects -1, 0 and abc with an actionable error", (command) => {
      run("setup", "--project-name", "IntTest");
      for (const limit of ["-1", "0", "abc"]) {
        const result = spawnSync("node", [CLI, command, "--limit", limit], {
          cwd: tmp,
          encoding: "utf-8",
          env: cleanEnv(),
        });
        expect(result.status, `${command} --limit ${limit}`).toBe(1);
        expect(result.stderr).toMatch(new RegExp(`Invalid --limit value: "${limit}"\\. Use a positive integer`));
      }
    });

    it("still caps the rows with a positive integer", () => {
      run("setup", "--project-name", "IntTest");
      run("task-create", "--title", "A", "--priority", "P1", "--description", "x");
      run("task-create", "--title", "B", "--priority", "P2", "--description", "x");
      expect(runJson("task-list", "--limit", "1")).toHaveLength(1);
      expect(runJson("task-list", "--limit", "5")).toHaveLength(2);
    });
  });

  describe("flag values that would inject frontmatter keys (RPT-028)", () => {
    const fail = (...args: string[]) =>
      spawnSync("node", [CLI, ...args], { cwd: tmp, encoding: "utf-8", env: cleanEnv() });

    it.each([
      ["report-move", "report-create", ["--type", "bug", "--severity", "low"], ".backlog/reports/pending/RPT-001-r.md", "RPT-001"],
      ["idea-move", "idea-create", ["--complexity", "low"], ".backlog/ideas/pending/PLN-001-r.md", "PLN-001"],
    ])("%s rejects a --task-id holding a newline and leaves the file unchanged", async (move, create, extra, file, id) => {
      run("setup", "--project-name", "IntTest");
      run(create, "--title", "r", ...extra, "--body", "x");
      const path = join(tmp, file);
      const before = await readFile(path, "utf-8");

      const status = move === "report-move" ? "triaged" : "approved";
      const result = fail(move, id, "--status", status, "--task-id", "TSK-001\nseverity: critical");

      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/Invalid --task-id/);
      expect(await readFile(path, "utf-8")).toBe(before);
    });

    it.each([
      ["report-move", "report-create", ["--type", "bug", "--severity", "low"], ".backlog/reports/pending/RPT-001-r.md", "RPT-001", "triaged"],
      ["idea-move", "idea-create", ["--complexity", "low"], ".backlog/ideas/pending/PLN-001-r.md", "PLN-001", "approved"],
    ])("%s rejects a --task-id that is not a task ID", async (move, create, extra, file, id, status) => {
      run("setup", "--project-name", "IntTest");
      run(create, "--title", "r", ...extra, "--body", "x");
      const path = join(tmp, file);
      const before = await readFile(path, "utf-8");

      const result = fail(move, id, "--status", status, "--task-id", "banana");

      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/Invalid --task-id: "banana"\. Use a task ID like TSK-001/);
      expect(await readFile(path, "utf-8")).toBe(before);
    });

    it("report-move still records a valid --task-id", async () => {
      run("setup", "--project-name", "IntTest");
      run("report-create", "--title", "r", "--type", "bug", "--severity", "low", "--body", "x");
      run("report-move", "RPT-001", "--status", "triaged", "--task-id", "TSK-001");
      const content = await readFile(join(tmp, ".backlog/reports/complete/RPT-001-r.md"), "utf-8");
      expect(content).toContain("task-id: TSK-001\n");
      expect(content).toContain("severity: low\n");
    });

    it("task-block rejects a --reason holding a newline and leaves the task unchanged", async () => {
      run("setup", "--project-name", "IntTest");
      run("task-create", "--title", "t", "--priority", "P3", "--description", "x");
      const path = join(tmp, ".backlog/tasks/pending/TSK-001-t.md");
      const before = await readFile(path, "utf-8");

      const result = fail("task-block", "TSK-001", "--reason", "waiting\npriority: P1");

      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/Invalid --reason: it must be a single line/);
      expect(await readFile(path, "utf-8")).toBe(before);
    });

    it.each([
      ["task-create", ["--title", "t", "--priority", "P3", "--description", "x"], ".backlog/tasks/pending"],
      ["learning-create", ["--title", "t", "--body", "x"], ".backlog/learnings"],
    ])("%s rejects --tags holding a newline and writes nothing", async (command, extra, dir) => {
      run("setup", "--project-name", "IntTest");
      const result = fail(command, ...extra, "--tags", "a\npriority: P1");

      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/Invalid --tags: it must be a single line/);
      expect((await readdir(join(tmp, dir))).filter((f) => /^(TSK|LRN)-/.test(f))).toEqual([]);
    });

    it("learning-update rejects --tags holding a newline and keeps the old tags", async () => {
      run("setup", "--project-name", "IntTest");
      run("learning-create", "--title", "Old title", "--tags", "x", "--body", "x");
      const path = join(tmp, ".backlog/learnings/LRN-001-old-title/index.md");
      const before = await readFile(path, "utf-8");

      const result = fail("learning-update", "LRN-001", "--tags", "y\nstatus: archived");

      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/Invalid --tags: it must be a single line/);
      expect(await readFile(path, "utf-8")).toBe(before);
    });
  });

  it("learning-update rejects a title holding a newline and keeps the old one", async () => {
    run("setup", "--project-name", "IntTest");
    run("learning-create", "--title", "Old title", "--tags", "x", "--body", "x");
    const result = spawnSync("node", [CLI, "learning-update", "LRN-001", "--title", "New\ntitle"], {
      cwd: tmp,
      encoding: "utf-8",
      env: cleanEnv(),
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Invalid title: it must be a single line/);
    expect(await readFile(join(tmp, ".backlog/learnings/LRN-001-old-title/index.md"), "utf-8")).toContain("title: Old title");
  });

  it("task-doctor plain output prints one tab-separated row per fix", async () => {
    run("setup", "--project-name", "IntTest");
    run("task-create", "--title", "Drifted", "--priority", "P2", "--description", "x");
    run("task-move", "TSK-001", "--to", "complete");
    const path = join(tmp, ".backlog/tasks/complete/TSK-001-drifted.md");
    const original = await readFile(path, "utf-8");
    await writeFile(path, original.replace("status: complete", "status: done"), "utf-8");

    const out = run("task-doctor");
    expect(out).not.toContain("[object Object]");
    const lines = out.split("\n");
    expect(lines[0]).toBe("scanned: 1");
    expect(lines[1]).toBe("fixed:");
    const cells = lines[2]!.split("\t");
    // The CLI resolves the backlog through realpath, so compare the path by its tail (LRN-036).
    expect(cells[1]).toMatch(/\/tasks\/complete\/TSK-001-drifted\.md$/);
    expect([cells[0], ...cells.slice(2)]).toEqual(["TSK-001", "complete", "done", "complete"]);
    expect(lines).toHaveLength(3);
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

  it("report-list lists pending reports and supports --status filter", () => {
    run("setup", "--project-name", "IntTest");
    run("report-create", "--title", "First report", "--type", "bug", "--severity", "high", "--body", "x");
    run("report-create", "--title", "Second report", "--type", "finding", "--severity", "low", "--body", "x");
    run("report-move", "RPT-002", "--status", "triaged", "--task-id", "TSK-001");

    const pending = runJson("report-list") as { id: string; severity: string }[];
    expect(pending.map((r) => r.id)).toEqual(["RPT-001"]);
    expect(pending[0]!.severity).toBe("high");

    expect(runJson("report-list", "--status", "all")).toHaveLength(2);
    const complete = runJson("report-list", "--status", "complete") as { id: string; status: string }[];
    expect(complete.map((r) => [r.id, r.status])).toEqual([["RPT-002", "triaged"]]);
    expect(run("report-list").split("\n")).toHaveLength(1);
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

  describe("private backlog (FLOWSTATE_BACKLOG_DIR)", () => {
    function runWithEnv(env: Record<string, string>, ...args: string[]): string {
      return execFileSync("node", [CLI, ...args], {
        cwd: tmp,
        encoding: "utf-8",
        timeout: 10000,
        env: cleanEnv(env),
      }).trim();
    }

    it("setup --dir creates the structure there and prints the settings snippet", async () => {
      const priv = join(tmp, "priv");
      const out = JSON.parse(
        run("setup", "--dir", priv, "--json", "true"),
      ) as { root: string; settingsFile: string; settingsSnippet: string };

      expect(out.root).toBe(priv);
      expect(out.settingsFile).toBe(".claude/settings.local.json");
      expect(JSON.parse(out.settingsSnippet)).toEqual({
        env: { FLOWSTATE_BACKLOG_DIR: priv },
      });
      expect((await readdir(join(priv, "tasks"))).sort()).toEqual([
        "active",
        "complete",
        "index.md",
        "pending",
      ]);
      await expect(readdir(join(tmp, ".backlog"))).rejects.toThrow();
    });

    it("commands use the env dir instead of .backlog", async () => {
      const priv = join(tmp, "priv");
      run("setup", "--dir", priv);
      runWithEnv(
        { FLOWSTATE_BACKLOG_DIR: priv },
        "task-create", "--title", "Private", "--priority", "P2", "--description", "x",
      );
      const files = await readdir(join(priv, "tasks", "pending"));
      expect(files.some((f) => f.startsWith("TSK-001"))).toBe(true);
      await expect(readdir(join(tmp, ".backlog"))).rejects.toThrow();
    });

    it("path prints the resolved dir (plain and json) with its source", async () => {
      const priv = join(tmp, "priv");
      run("setup", "--dir", priv);
      const env = { FLOWSTATE_BACKLOG_DIR: priv };
      expect(runWithEnv(env, "path")).toBe(priv);
      expect(JSON.parse(runWithEnv(env, "path", "--json", "true"))).toEqual({
        path: priv,
        source: "env",
        backend: "file",
      });

      run("setup");
      const walk = JSON.parse(run("path", "--json", "true")) as { path: string; source: string };
      expect(walk.source).toBe("walk-up");
      expect(walk.path.endsWith(".backlog")).toBe(true);
    });

    it("a configured but missing dir fails with an actionable error", () => {
      try {
        runWithEnv({ FLOWSTATE_BACKLOG_DIR: join(tmp, "missing") }, "task-list");
        expect.unreachable("should have thrown");
      } catch (err) {
        const error = err as { status: number; stderr: string };
        expect(error.status).toBe(1);
        expect(error.stderr.toString()).toMatch(/does not exist/);
      }
    });

    it("setup --private uses <common-git-dir>/flowstate", async () => {
      execFileSync("git", ["init", "-q"], { cwd: tmp });
      const out = JSON.parse(run("setup", "--private", "--json", "true")) as {
        root: string;
      };
      expect(out.root.endsWith(join(".git", "flowstate"))).toBe(true);
      expect((await readdir(out.root)).sort()).toEqual([
        "ideas",
        "learnings",
        "reports",
        "tasks",
      ]);
    });
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

describe("shared learnings across backlogs", () => {
  let parent: string;
  let home: string;
  let project: string;
  let sibling: string;

  function runAt(cwd: string, extra: Record<string, string>, ...args: string[]): string {
    return execFileSync("node", [CLI, ...args], {
      cwd,
      encoding: "utf-8",
      timeout: 10000,
      env: cleanEnv({ XDG_CONFIG_HOME: home, ...extra }),
    }).trim();
  }

  beforeEach(async () => {
    parent = await mkdtemp(join(tmpdir(), "flowstate-shared-"));
    home = join(parent, "config");
    project = join(parent, "local-project");
    sibling = join(parent, "billing-service");
    await mkdir(project);
    await mkdir(sibling);
  });

  afterEach(async () => {
    await rm(parent, { recursive: true, force: true });
  });

  it("registers the backlog on setup", async () => {
    runAt(project, {}, "setup", "--project-name", "Local");
    const registry = await readFile(join(home, "flowstate", "backlogs"), "utf-8");
    expect(registry).toContain(join(await realpath(project), ".backlog"));
  });

  it("reads a sibling backlog and labels each learning with its project", () => {
    runAt(sibling, {}, "setup", "--project-name", "Billing");
    runAt(sibling, {}, "learning-create", "--title", "Redis quirk in billing", "--tags", "redis", "--body", "x");
    runAt(project, {}, "setup", "--project-name", "Local");
    runAt(project, {}, "learning-create", "--title", "Redis quirk local", "--tags", "redis", "--body", "y");

    const results = JSON.parse(
      runAt(project, {}, "learning-search", "--tags", "redis", "--json", "true"),
    ) as { source: string }[];
    expect(results.map((r) => r.source)).toEqual(["local", "billing-service"]);
  });

  it("appends source as the last text column", () => {
    runAt(sibling, {}, "setup", "--project-name", "Billing");
    runAt(sibling, {}, "learning-create", "--title", "Redis quirk in billing", "--tags", "redis", "--body", "x");
    runAt(project, {}, "setup", "--project-name", "Local");
    runAt(project, {}, "learning-create", "--title", "Redis quirk local", "--tags", "redis", "--body", "y");

    const lines = runAt(project, {}, "learning-search", "--tags", "redis").split("\n");
    expect(lines.map((line) => line.split("\t").at(-1))).toEqual(["local", "billing-service"]);
  });

  it("scope local keeps sibling learnings out of the output", () => {
    runAt(sibling, {}, "setup", "--project-name", "Billing");
    runAt(sibling, {}, "learning-create", "--title", "Redis quirk in billing", "--tags", "redis", "--body", "x");
    runAt(project, {}, "setup", "--project-name", "Local");

    const out = runAt(project, {}, "learning-search", "--tags", "redis", "--scope", "local", "--json", "true");
    expect(JSON.parse(out)).toEqual([]);
  });

  it("FLOWSTATE_SHARED=off neither registers nor reads", async () => {
    runAt(sibling, {}, "setup", "--project-name", "Billing");
    runAt(sibling, {}, "learning-create", "--title", "Redis quirk in billing", "--tags", "redis", "--body", "x");

    const off = { FLOWSTATE_SHARED: "off" };
    runAt(project, off, "setup", "--project-name", "Local");
    const registry = await readFile(join(home, "flowstate", "backlogs"), "utf-8");
    expect(registry).toContain(join(await realpath(sibling), ".backlog"));
    expect(registry).not.toContain(join(await realpath(project), ".backlog"));
    const results = JSON.parse(
      runAt(project, off, "learning-search", "--tags", "redis", "--json", "true"),
    ) as unknown[];
    expect(results).toEqual([]);
  });

  it("rejects an invalid --scope value", () => {
    runAt(project, {}, "setup", "--project-name", "Local");
    const result = spawnSync("node", [CLI, "learning-search", "--tags", "redis", "--scope", "everywhere"], {
      cwd: project,
      encoding: "utf-8",
      env: cleanEnv({ XDG_CONFIG_HOME: home }),
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Invalid --scope value: "everywhere"/);
  });

  it("an unreadable registry warns on registration but does not fail setup", async () => {
    await mkdir(join(home, "flowstate", "backlogs"), { recursive: true });
    const result = spawnSync("node", [CLI, "setup", "--project-name", "Local"], {
      cwd: project,
      encoding: "utf-8",
      env: cleanEnv({ XDG_CONFIG_HOME: home }),
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toMatch(/backlog not registered for shared learnings/);
  });

  it("an unreadable registry fails learning-search with an actionable error", async () => {
    runAt(project, {}, "setup", "--project-name", "Local");
    // The setup above wrote the registry as a file; swap it for a directory to make it unreadable.
    await rm(join(home, "flowstate", "backlogs"));
    await mkdir(join(home, "flowstate", "backlogs"));
    const result = spawnSync("node", [CLI, "learning-search", "--tags", "redis"], {
      cwd: project,
      encoding: "utf-8",
      env: cleanEnv({ XDG_CONFIG_HOME: home }),
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Cannot read the shared backlog registry/);
    expect(result.stderr).toMatch(/FLOWSTATE_SHARED=off/);
  });
});
