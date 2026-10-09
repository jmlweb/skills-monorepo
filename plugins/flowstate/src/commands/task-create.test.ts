import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { taskCreate } from "./task-create.js";
import { setup } from "./setup.js";
import { taskCondense } from "./task-condense.js";
import { taskMove } from "./task-move.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("taskCreate", () => {
  it("creates a task file in pending/", async () => {
    const result = await taskCreate(tmp, {
      title: "Fix authentication bug",
      priority: "P2",
      tags: ["api", "auth"],
      description: "The auth flow fails when tokens expire.",
      criteria: ["Token refresh works", "Error message shown"],
      source: "manual",
      dependsOn: [],
    });

    expect(result.id).toBe("TSK-001");
    expect(result.path).toContain("TSK-001-fix-authentication-bug.md");

    const content = await readFile(result.path, "utf-8");
    expect(content).toContain("id: TSK-001");
    expect(content).toContain("title: Fix authentication bug");
    expect(content).toContain("priority: P2");
    expect(content).toContain("tags: [api, auth]");
    expect(content).toContain("source: manual");
    expect(content).toContain("- [ ] Token refresh works");
    expect(content).toContain("- [ ] Error message shown");
    expect(content).toContain("The auth flow fails when tokens expire.");
  });

  it("increments ID for subsequent tasks", async () => {
    await taskCreate(tmp, {
      title: "First task",
      priority: "P3",
      tags: [],
      description: "Desc",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });

    const result = await taskCreate(tmp, {
      title: "Second task",
      priority: "P1",
      tags: ["urgent"],
      description: "Desc 2",
      criteria: ["Done"],
      source: "manual",
      dependsOn: [],
    });

    expect(result.id).toBe("TSK-002");
  });

  it("updates the task index", async () => {
    await taskCreate(tmp, {
      title: "Fix bug",
      priority: "P2",
      tags: ["api"],
      description: "Desc",
      criteria: [],
      source: "manual",
      dependsOn: [],
    });

    const index = await readFile(
      join(tmp, "tasks", "index.md"),
      "utf-8",
    );
    expect(index).toContain("| TSK-001 | Fix bug | P2 |");
    expect(index).toContain("| Pending | 1 |");
  });

  it("handles plan source", async () => {
    const result = await taskCreate(tmp, {
      title: "From plan",
      priority: "P2",
      tags: [],
      description: "Created from plan",
      criteria: [],
      source: "plan/PLN-001",
      dependsOn: [],
    });

    const content = await readFile(result.path, "utf-8");
    expect(content).toContain("source: plan/PLN-001");
  });
  describe("idea-style body", () => {
    const ideaBody = [
      "## Goal",
      "",
      "Ship it.",
      "",
      "## Approach",
      "",
      "```md",
      "## Notes",
      "```",
      "",
      "## Notes",
      "",
      "Idea note.",
    ].join("\n");

    const create = () =>
      taskCreate(tmp, {
        title: "Idea task",
        priority: "P3",
        tags: [],
        description: ideaBody,
        criteria: ["Done"],
        source: "idea/IDE-001",
        dependsOn: [],
      });

    it("nests idea headings under Description", async () => {
      const content = await readFile((await create()).path, "utf-8");
      const description = content.split("## Acceptance Criteria")[0]!;
      expect(description).toContain("## Description\n\n### Goal\n\nShip it.");
      expect(description).toContain("### Approach");
      expect(content).not.toMatch(/^## Goal/m);
    });

    it("merges idea Notes into the single task Notes", async () => {
      const content = await readFile((await create()).path, "utf-8");
      const outsideFences = content.replace(/```[\s\S]*?```/g, "");
      expect(outsideFences.match(/^## Notes$/gm)).toHaveLength(1);
      expect(content).toMatch(/## Notes\n\nIdea note\.\n\n## Learnings/);
    });

    it("leaves fenced '## Notes' inside Description untouched", async () => {
      const content = await readFile((await create()).path, "utf-8");
      expect(content).toContain("```md\n## Notes\n```");
    });

    it("keeps task-condense acting on the single Notes section", async () => {
      const { id } = await taskCreate(tmp, {
        title: "Condense me",
        priority: "P3",
        tags: [],
        description: "## Goal\n\nShip it.\n\n## Notes\n\nIdea note.",
        criteria: ["Done"],
        source: "idea/IDE-001",
        dependsOn: [],
      });
      await taskMove(tmp, id, "complete");
      await taskCondense(tmp, id);
      const dir = join(tmp, "tasks", "complete");
      const file = (await readdir(dir)).find((f) => f.startsWith(`${id}-`));
      const content = await readFile(join(dir, file!), "utf-8");
      expect(content).not.toContain("Idea note.");
      expect(content.match(/^## Notes$/gm)).toHaveLength(1);
    });
  });
});
