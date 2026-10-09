import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { taskCreate } from "./task-create.js";
import { taskNormalize } from "./task-normalize.js";
import { setup } from "./setup.js";
import { EntityNotFoundError } from "../core/errors.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("taskNormalize", () => {
  it("merges duplicate Notes into the first and is idempotent", async () => {
    const { id, path } = await taskCreate(tmp, {
      title: "Dup notes",
      priority: "P3",
      tags: [],
      description: "Desc",
      criteria: ["A"],
      source: "manual",
      dependsOn: [],
    });
    const original = await readFile(path, "utf-8");
    await writeFile(
      path,
      original.replace(
        "## Acceptance Criteria",
        "## Notes\n\nFirst note.\n\n## Acceptance Criteria",
      ).replace("## Learnings", "## Notes\n\nSecond note.\n\n## Learnings"),
      "utf-8",
    );

    const first = await taskNormalize(tmp, id);
    expect(first.changed).toBe(true);

    const content = await readFile(path, "utf-8");
    expect(content.match(/^## Notes$/gm)).toHaveLength(1);
    expect(content).toMatch(/## Notes\n\nFirst note\.\n\nSecond note\./);
    expect(content).toContain("## Acceptance Criteria\n\n- [ ] A");
    expect(content).toContain("## Learnings");

    expect((await taskNormalize(tmp, id)).changed).toBe(false);
  });

  it("throws for an unknown task", async () => {
    await expect(taskNormalize(tmp, "TSK-999")).rejects.toBeInstanceOf(
      EntityNotFoundError,
    );
  });
});
