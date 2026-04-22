import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { reportCreate } from "./report-create.js";
import { reportMove } from "./report-move.js";
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

describe("reportCreate", () => {
  it("creates a report in reports/pending/", async () => {
    const result = await reportCreate(tmp, {
      title: "Auth token leak",
      type: "security",
      severity: "critical",
      body: "# Auth token leak\n\n## Summary\n\nTokens exposed in logs.",
    });

    expect(result.id).toBe("RPT-001");
    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["type"]).toBe("security");
    expect(fm["severity"]).toBe("critical");
  });
});

describe("reportMove", () => {
  it("moves report to complete/ with triaged status", async () => {
    const { id } = await reportCreate(tmp, {
      title: "Bug found",
      type: "bug",
      severity: "high",
      body: "Details",
    });

    const result = await reportMove(tmp, id, "triaged", "TSK-001");
    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["status"]).toBe("triaged");
    expect(fm["task-id"]).toBe("TSK-001");
  });

  it("moves report to complete/ with discarded status when no task is linked", async () => {
    const { id } = await reportCreate(tmp, {
      title: "Duplicate",
      type: "bug",
      severity: "low",
      body: "Already reported elsewhere",
    });

    const result = await reportMove(tmp, id, "discarded");
    const doc = await readEntity(result.path);
    const fm = doc.frontmatter as Record<string, unknown>;
    expect(fm["status"]).toBe("discarded");
    expect(fm["task-id"]).toBeUndefined();
    expect(result.path).toContain("/reports/complete/");
  });
});
