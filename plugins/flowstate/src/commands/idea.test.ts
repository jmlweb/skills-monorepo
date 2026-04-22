import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ideaCreate } from "./idea-create.js";
import { ideaMove } from "./idea-move.js";
import { setup } from "./setup.js";
import { readEntity } from "../core/fs.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("ideaCreate", () => {
  it("creates an idea in ideas/pending/", async () => {
    const result = await ideaCreate(tmp, {
      title: "Refactor auth module",
      complexity: "medium",
      body: "# Refactor auth module\n\n## Goal\n\nClean up auth.",
    });

    expect(result.id).toBe("PLN-001");
    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["complexity"]).toBe("medium");
    expect(fm["status"]).toBe("pending");
    expect(doc.body).toContain("## Goal");
  });
});

describe("ideaMove", () => {
  it("moves idea to complete/ with approved status", async () => {
    const { id } = await ideaCreate(tmp, {
      title: "Refactor auth",
      complexity: "high",
      body: "Idea body",
    });

    const result = await ideaMove(tmp, id, "approved", "TSK-001");

    expect(result.path).toContain("ideas/complete/");
    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["status"]).toBe("approved");
    expect(fm["reviewed"]).toBeTruthy();
    expect(fm["task-id"]).toBe("TSK-001");
  });

  it("moves idea to complete/ with discarded status", async () => {
    const { id } = await ideaCreate(tmp, {
      title: "Bad idea",
      complexity: "low",
      body: "Nope",
    });

    const result = await ideaMove(tmp, id, "discarded");
    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["status"]).toBe("discarded");
    expect(fm["task-id"]).toBeUndefined();
  });

  it("throws for non-existent idea", async () => {
    await expect(ideaMove(tmp, "PLN-999", "approved")).rejects.toThrow("not found");
  });
});
