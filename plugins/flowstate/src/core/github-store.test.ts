import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GithubStore, LIST_LIMIT } from "./github-store.js";
import { openStubGh, type StubGh, type StubIssue } from "./github-stub.test-support.js";
import { GhCommandError, GhIssueStateError, GhIssueTypeError, MetadataBlockError } from "./errors.js";
import { taskCreate } from "../commands/task-create.js";
import { taskMove } from "../commands/task-move.js";
import { taskBlock } from "../commands/task-block.js";
import { taskUnblock } from "../commands/task-unblock.js";
import { taskList } from "../commands/task-list.js";
import { taskUpdate } from "../commands/task-update.js";
import { taskCompress } from "../commands/task-compress.js";
import { taskCondense } from "../commands/task-condense.js";
import { ideaCreate } from "../commands/idea-create.js";
import { ideaMove } from "../commands/idea-move.js";
import { reportCreate } from "../commands/report-create.js";
import { reportMove } from "../commands/report-move.js";

let stub: StubGh;
let store: GithubStore;

beforeEach(async () => {
  stub = await openStubGh();
  store = new GithubStore(stub.repo, stub.gh);
});

afterEach(async () => {
  await stub.close();
});

const issue = async (number: number): Promise<StubIssue> => {
  const found = (await stub.readState()).issues.find((i) => i.number === number);
  if (!found) throw new Error(`stub has no issue #${number}`);
  return found;
};

const seed = async (partial: Partial<StubIssue> & { labels: string[] }): Promise<number> => {
  const state = await stub.readState();
  const number = state.nextNumber++;
  state.issues.push({ number, title: `Issue ${number}`, body: "", state: "OPEN", ...partial });
  await stub.writeState(state);
  return number;
};

const newTask = (title = "Ship it", tags: string[] = ["backend", "auth"]) =>
  taskCreate(store, { title, priority: "P2", tags, description: "Desc", criteria: ["It works"], source: "manual", dependsOn: ["TSK-009"] });

const editCalls = async () => (await stub.calls()).filter((c) => c[0] === "issue" && c[1] === "edit");

describe("GithubStore: tasks", () => {
  it("creates one issue per task: number as ID, type + priority + tag labels, metadata block on top", async () => {
    const { id, path } = await newTask();
    expect(id).toBe("TSK-001");
    expect(path).toBe(`https://github.com/${stub.repo}/issues/1`);

    const created = await issue(1);
    expect(created.title).toBe("Ship it");
    expect(created.labels).toEqual(["flowstate:task", "P2", "backend", "auth"]);
    expect(created.body.startsWith("```flowstate\n")).toBe(true);
    expect(created.body).toContain("\nsource: manual\n");
    expect(created.body).toContain("\ndepends-on: [TSK-009]\n");
    expect(created.body).toContain("\n```\n\n# Ship it\n");
    expect(created.body).not.toMatch(/^id:|^status:|^priority:|^tags:/m);
  });

  it("reads the task back with the same frontmatter shape file mode produces", async () => {
    await newTask();
    const task = (await store.find("task", "TSK-001", ["pending"]))!;
    expect(task.frontmatter).toMatchObject({
      id: "TSK-001", title: "Ship it", status: "pending", priority: "P2", tags: ["backend", "auth"],
      source: "manual", "depends-on": ["TSK-009"],
    });
    expect(task.frontmatter["created"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(task.body).toContain("# Ship it");
    expect(task.body).not.toContain("```flowstate");
  });

  it("maps buckets to labels and state: active = status:active, complete = closed", async () => {
    await newTask();
    await taskMove(store, "TSK-001", "active");
    expect((await issue(1)).labels).toContain("status:active");
    expect((await issue(1)).state).toBe("OPEN");
    expect((await store.list("task", ["active"])).map((t) => t.id)).toEqual(["TSK-001"]);

    await taskMove(store, "TSK-001", "complete");
    const closed = await issue(1);
    expect(closed.state).toBe("CLOSED");
    expect(closed.labels).toEqual(["flowstate:task", "P2", "backend", "auth"]);
    expect(await store.list("task", ["active"])).toEqual([]);
    expect((await store.find("task", "TSK-001", ["complete"]))?.frontmatter["status"]).toBe("complete");
  });

  it("keeps a blocked task in the bucket it sits in (LRN-040): pending stays pending", async () => {
    await newTask();
    await taskBlock(store, "TSK-001", "waiting on infra");

    const blocked = await issue(1);
    expect(blocked.labels).toContain("status:blocked");
    expect(blocked.labels).not.toContain("status:active");
    expect(blocked.body).toContain("\nblocked-by: waiting on infra\n");

    const pending = await store.list("task", ["pending"]);
    expect(pending.map((t) => t.frontmatter["status"])).toEqual(["blocked"]);
    expect(await store.list("task", ["active"])).toEqual([]);
    expect((await taskList(store, "blocked")).map((t) => t.id)).toEqual(["TSK-001"]);

    await taskUnblock(store, "TSK-001");
    expect((await issue(1)).labels).not.toContain("status:blocked");
    expect((await issue(1)).body).not.toContain("blocked-by");
  });

  it("swaps labels, title and body in one issue edit per save", async () => {
    await newTask();
    await taskMove(store, "TSK-001", "active");
    await taskBlock(store, "TSK-001", "x");
    await taskMove(store, "TSK-001", "complete");

    const edits = await editCalls();
    expect(edits).toHaveLength(3);
    const last = edits[2]!;
    expect(last).toContain("--body-file");
    expect(last).toContain("--title");
    expect(last.filter((a) => a === "--remove-label")).toHaveLength(2);
    expect(last.slice(last.indexOf("--remove-label"))).toEqual(
      expect.arrayContaining(["status:active", "status:blocked"]),
    );
    const closes = (await stub.calls()).filter((c) => c[1] === "close");
    expect(closes).toEqual([["issue", "close", "1", "--repo", stub.repo, "--reason", "completed"]]);
  });

  it("reopens the issue when a complete task returns to pending", async () => {
    await newTask();
    await taskMove(store, "TSK-001", "complete");
    await taskMove(store, "TSK-001", "pending");
    expect((await issue(1)).state).toBe("OPEN");
    expect((await store.list("task", ["pending"])).map((t) => t.id)).toEqual(["TSK-001"]);
  });

  it("turns tag changes into label changes and creates a new tag label on first use", async () => {
    await newTask();
    await taskUpdate(store, "TSK-001", { tags: "backend,urgent" });

    expect((await issue(1)).labels).toEqual(["flowstate:task", "P2", "backend", "urgent"]);
    const labelCreates = (await stub.calls()).filter((c) => c[0] === "label" && c[1] === "create");
    expect(labelCreates.map((c) => c[2])).toEqual(["backend", "auth", "urgent"]);
    expect((await stub.readState()).labels).toContain("urgent");
  });

  it("changes the priority label on task-update", async () => {
    await newTask();
    await taskUpdate(store, "TSK-001", { priority: "P1" });
    expect((await issue(1)).labels).toEqual(["flowstate:task", "backend", "auth", "P1"]);
    expect((await store.find("task", "TSK-001", ["pending"]))?.frontmatter["priority"]).toBe("P1");
  });

  it("lists buckets in the requested order, numbers ascending within a bucket", async () => {
    await newTask("A");
    await newTask("B");
    await newTask("C");
    await taskMove(store, "TSK-002", "complete");
    const ids = (await store.list("task", ["complete", "pending"])).map((t) => t.id);
    expect(ids).toEqual(["TSK-002", "TSK-001", "TSK-003"]);
  });
});

describe("GithubStore: ideas and reports", () => {
  it("closes an approved idea with exactly one final-state label and the task link in the block", async () => {
    const { id } = await ideaCreate(store, { title: "Cache", complexity: "medium", body: "## Goal\n" });
    expect(id).toBe("PLN-001");
    await ideaMove(store, "PLN-001", "approved", "TSK-042");

    const closed = await issue(1);
    expect(closed.state).toBe("CLOSED");
    expect(closed.stateReason).toBe("COMPLETED");
    expect(closed.labels).toEqual(["flowstate:idea", "status:approved"]);
    expect(closed.body).toContain("\ntask-id: TSK-042\n");
    expect(closed.body).toContain("\ncomplexity: medium\n");

    const found = (await store.find("idea", "PLN-001", ["complete"]))!;
    expect(found.frontmatter).toMatchObject({ status: "approved", "task-id": "TSK-042", complexity: "medium" });
    expect(await store.list("idea", ["pending"])).toEqual([]);
  });

  it("closes a discarded report as not planned and a triaged one as completed", async () => {
    await reportCreate(store, { title: "Leak", type: "bug", severity: "high", body: "" });
    await reportCreate(store, { title: "Noise", type: "finding", severity: "low", body: "" });
    await reportMove(store, "RPT-001", "triaged", "TSK-007");
    await reportMove(store, "RPT-002", "discarded");

    expect((await issue(1)).labels).toEqual(["flowstate:report", "status:triaged"]);
    expect((await issue(2)).labels).toEqual(["flowstate:report", "status:discarded"]);
    expect((await issue(2)).stateReason).toBe("NOT_PLANNED");
    const complete = await store.list("report", ["complete"]);
    expect(complete.map((r) => r.frontmatter["status"])).toEqual(["triaged", "discarded"]);
    expect(complete[0]?.frontmatter).toMatchObject({ type: "bug", severity: "high", "task-id": "TSK-007" });
  });

  it("keeps a human's extra label on an idea across a save", async () => {
    await ideaCreate(store, { title: "Cache", complexity: "low", body: "" });
    const state = await stub.readState();
    state.issues[0]!.labels.push("enhancement");
    await stub.writeState(state);

    await ideaMove(store, "PLN-001", "discarded");
    expect((await issue(1)).labels).toEqual(["flowstate:idea", "enhancement", "status:discarded"]);
  });

  it("rejects a closed idea with no final-state label, naming the issue", async () => {
    const n = await seed({ labels: ["flowstate:idea"], state: "CLOSED" });
    await expect(store.list("idea", ["complete"])).rejects.toBeInstanceOf(GhIssueStateError);
    await expect(store.find("idea", `PLN-00${n}`, ["complete"])).rejects.toThrow(
      new RegExp(`Issue #${n} .*no final-state label .*status:approved or status:discarded`),
    );
  });

  it("rejects a closed report carrying two final-state labels, or one of another type", async () => {
    const two = await seed({ labels: ["flowstate:report", "status:triaged", "status:discarded"], state: "CLOSED" });
    await expect(store.find("report", `RPT-00${two}`, ["complete"])).rejects.toThrow(/carries status:triaged, status:discarded/);

    const foreign = await seed({ labels: ["flowstate:report", "status:approved"], state: "CLOSED" });
    await expect(store.find("report", `RPT-00${foreign}`, ["complete"])).rejects.toThrow(/carries status:approved/);

    const stray = await seed({ labels: ["flowstate:report", "status:triaged", "status:active"], state: "CLOSED" });
    await expect(store.find("report", `RPT-00${stray}`, ["complete"])).rejects.toThrow(/status:triaged, status:active/);
  });

  it("reads an open idea as pending whatever status labels it carries", async () => {
    const n = await seed({ labels: ["flowstate:idea", "status:approved"], state: "OPEN" });
    expect((await store.find("idea", `PLN-00${n}`, ["pending"]))?.frontmatter["status"]).toBe("pending");
  });
});

describe("GithubStore: lookups that must fail clearly", () => {
  it("returns undefined for an ID of another type without a network call", async () => {
    expect(await store.find("idea", "TSK-001", ["pending", "complete"])).toBeUndefined();
    expect(await stub.calls()).toEqual([]);
  });

  it("returns undefined for a number that is no issue", async () => {
    expect(await store.find("task", "TSK-999", ["pending", "active", "complete"])).toBeUndefined();
  });

  it("throws GhIssueTypeError when the number is a pull request", async () => {
    const n = await seed({ labels: [], isPullRequest: true });
    await expect(store.find("task", `TSK-00${n}`, ["pending"])).rejects.toBeInstanceOf(GhIssueTypeError);
    await expect(store.find("task", `TSK-00${n}`, ["pending"])).rejects.toThrow(/is a pull request/);
  });

  it("throws GhIssueTypeError when the number belongs to another flowstate type, naming its ID", async () => {
    await ideaCreate(store, { title: "Idea", complexity: "low", body: "" });
    await expect(store.find("task", "TSK-001", ["pending"])).rejects.toThrow(/Issue #1 .*is a flowstate idea \(PLN-001\), not a task/);
  });

  it("throws GhIssueTypeError when the issue carries no flowstate label at all", async () => {
    const n = await seed({ labels: ["bug"] });
    await expect(store.find("report", `RPT-00${n}`, ["pending"])).rejects.toThrow(/no "flowstate:report" label \(labels: bug\)/);
  });

  it("refuses a list that hits the explicit limit instead of truncating it (LRN-001)", async () => {
    const state = await stub.readState();
    for (let i = 0; i < LIST_LIMIT; i++) {
      state.issues.push({ number: state.nextNumber++, title: `t${i}`, body: "", labels: ["flowstate:task"], state: "OPEN" });
    }
    await stub.writeState(state);
    await expect(store.list("task", ["pending"])).rejects.toBeInstanceOf(GhCommandError);
    await expect(store.list("task", ["pending"])).rejects.toThrow(/truncated/);
  });
});

describe("GithubStore: metadata block", () => {
  it("reads an issue without a block as empty metadata and writes one on the next save", async () => {
    const n = await seed({ labels: ["flowstate:task", "P3"], title: "By hand", body: "Typed on github.com\n" });
    const task = (await store.find("task", `TSK-00${n}`, ["pending"]))!;
    expect(task.frontmatter).toEqual({ id: `TSK-00${n}`, title: "By hand", status: "pending", priority: "P3", tags: [] });
    expect(task.body).toBe("Typed on github.com\n");

    await taskMove(store, `TSK-00${n}`, "active");
    const body = (await issue(n)).body;
    expect(body).toMatch(/^```flowstate\nstarted: \d{4}-\d{2}-\d{2}\n```\nTyped on github.com\n/);
  });

  it("fails loudly on a malformed block, naming the issue", async () => {
    const n = await seed({ labels: ["flowstate:task"], body: "```flowstate\ncreated: 2026-01-01\n# no closing fence\n" });
    await expect(store.find("task", `TSK-00${n}`, ["pending"])).rejects.toBeInstanceOf(MetadataBlockError);
    await expect(store.list("task", ["pending"])).rejects.toThrow(new RegExp(`Issue #${n} has a malformed flowstate metadata block`));
  });

  it("task-compress rewrites the body and keeps the block intact", async () => {
    await newTask();
    await taskMove(store, "TSK-001", "complete");
    const before = (await issue(1)).body;
    const blockBefore = before.slice(0, before.indexOf("\n```\n") + 5);
    const task = (await store.find("task", "TSK-001", ["complete"]))!;
    const compressed = task.body
      .replace("## Description\n\nDesc", "## Description\n\nD")
      .replace("## Notes\n", "## Notes\n");

    const result = await taskCompress(store, "TSK-001", compressed);
    expect(result.ok).toBe(true);
    const after = (await issue(1)).body;
    expect(after.startsWith(blockBefore.replace("\n```\n", "\ncompressed: true\n```\n"))).toBe(true);
    expect(after).toContain("## Description\n\nD");
    expect((await store.find("task", "TSK-001", ["complete"]))?.frontmatter["compressed"]).toBe("true");
  });

  it("task-condense trims the body and keeps the block intact", async () => {
    await newTask();
    for (let i = 0; i < 4; i++) await taskUpdate(store, "TSK-001", {}, `step ${i}`);
    await taskMove(store, "TSK-001", "complete");

    const result = await taskCondense(store, "TSK-001");
    expect(result.condensed).toBe(true);
    const after = (await issue(1)).body;
    expect(after).toMatch(/^```flowstate\n[\s\S]*\ncondensed: true\n```\n/);
    expect(after).toContain("\nsource: manual\n");
    expect(after).not.toContain("step 1");
    expect(after).toContain("Condensed");
  });
});
