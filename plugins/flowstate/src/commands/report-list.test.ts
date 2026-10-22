import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { reportList } from "./report-list.js";
import { reportCreate } from "./report-create.js";
import { reportMove } from "./report-move.js";
import { setup } from "./setup.js";
import { FileStore } from "../core/file-store.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

const fileReport = (title: string, severity: "low" | "critical") =>
  reportCreate(new FileStore(tmp), { title, type: "bug", severity, body: "body" });

describe("reportList", () => {
  it("returns empty when no reports exist", async () => {
    expect(await reportList(new FileStore(tmp))).toEqual([]);
  });

  it("lists pending reports by default, sorted by ID", async () => {
    await fileReport("Low one", "low");
    await fileReport("Critical one", "critical");

    const results = await reportList(new FileStore(tmp));
    expect(results.map((r) => r.id)).toEqual(["RPT-001", "RPT-002"]);
    expect(results[1]).toMatchObject({
      title: "Critical one",
      type: "bug",
      severity: "critical",
      status: "pending",
    });
    expect(results[0]!.path).toContain(join("reports", "pending", "RPT-001-"));
  });

  it("filters by status complete and all", async () => {
    await fileReport("Keep", "low");
    await fileReport("Triage", "low");
    await reportMove(new FileStore(tmp), "RPT-002", "triaged", "TSK-001");

    const pending = await reportList(new FileStore(tmp));
    expect(pending.map((r) => r.id)).toEqual(["RPT-001"]);

    const complete = await reportList(new FileStore(tmp), { status: "complete" });
    expect(complete).toHaveLength(1);
    expect(complete[0]).toMatchObject({ id: "RPT-002", status: "triaged", taskId: "TSK-001" });

    expect(await reportList(new FileStore(tmp), { status: "all" })).toHaveLength(2);
  });

  it("applies the limit after sorting", async () => {
    await fileReport("A", "low");
    await fileReport("B", "low");

    const results = await reportList(new FileStore(tmp), { limit: 1 });
    expect(results.map((r) => r.id)).toEqual(["RPT-001"]);
  });

  it("throws when the backlog itself is missing instead of reading as empty", async () => {
    await expect(reportList(new FileStore(join(tmp, "nope")))).rejects.toThrow();
  });
});
