import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { taskDoctorGithub } from "./task-doctor.js";
import { taskCreate } from "./task-create.js";
import { taskMove } from "./task-move.js";
import { taskBlock } from "./task-block.js";
import { ideaCreate } from "./idea-create.js";
import { GithubStore } from "../core/github-store.js";
import { openStubGh, type StubGh } from "../core/github-stub.test-support.js";

let stub: StubGh;
let store: GithubStore;

beforeEach(async () => {
  stub = await openStubGh();
  store = new GithubStore(stub.repo, stub.gh);
});

afterEach(async () => {
  await stub.close();
});

const newTask = (title: string) =>
  taskCreate(store, { title, priority: "P2", tags: [], description: "", criteria: [], source: "manual", dependsOn: [] });

async function tamperLabels(number: number, labels: string[]): Promise<void> {
  const state = await stub.readState();
  state.issues.find((i) => i.number === number)!.labels = labels;
  await stub.writeState(state);
}

describe("taskDoctor in GitHub mode", () => {
  it("reports clean when labels match state and metadata", async () => {
    await newTask("A");
    await taskMove(store, "TSK-001", "active");
    await ideaCreate(store, { title: "I", complexity: "low", body: "" });

    expect(await taskDoctorGithub(store)).toEqual({ scanned: 2, fixed: [], invalid: [] });
  });

  it("realigns status labels with the issue state and the metadata block", async () => {
    await newTask("Blocked but unlabelled");
    await taskBlock(store, "TSK-001", "waiting");
    await tamperLabels(1, ["flowstate:task", "P2"]);

    await newTask("Labelled blocked without a reason");
    await tamperLabels(2, ["flowstate:task", "P2", "status:blocked"]);

    await newTask("Closed but still active");
    await taskMove(store, "TSK-003", "active");
    await taskMove(store, "TSK-003", "complete");
    await tamperLabels(3, ["flowstate:task", "P2", "status:active"]);

    const result = await taskDoctorGithub(store);
    expect(result.scanned).toBe(3);
    expect(result.fixed).toEqual([
      { id: "TSK-001", path: `https://github.com/${stub.repo}/issues/1`, added: "status:blocked", removed: "" },
      { id: "TSK-002", path: `https://github.com/${stub.repo}/issues/2`, added: "", removed: "status:blocked" },
      { id: "TSK-003", path: `https://github.com/${stub.repo}/issues/3`, added: "", removed: "status:active" },
    ]);
    expect(result.invalid).toEqual([]);

    const state = await stub.readState();
    expect(state.issues.map((i) => i.labels)).toEqual([
      ["flowstate:task", "P2", "status:blocked"],
      ["flowstate:task", "P2"],
      ["flowstate:task", "P2"],
    ]);
    expect(await taskDoctorGithub(store)).toEqual({ scanned: 3, fixed: [], invalid: [] });
  });

  it("dry-run lists the fixes and edits nothing", async () => {
    await newTask("A");
    await taskBlock(store, "TSK-001", "waiting");
    await tamperLabels(1, ["flowstate:task", "P2"]);
    const before = (await stub.calls()).length;

    const result = await taskDoctorGithub(store, { dryRun: true });
    expect(result.fixed).toHaveLength(1);
    expect((await stub.calls()).slice(before).filter((c) => c[1] === "edit")).toEqual([]);
    expect((await stub.readState()).issues[0]?.labels).toEqual(["flowstate:task", "P2"]);
  });

  it("lists closed ideas and reports whose final-state labels are invalid, without touching them", async () => {
    const state = await stub.readState();
    state.issues.push(
      { number: 1, title: "no label", body: "", labels: ["flowstate:idea"], state: "CLOSED" },
      { number: 2, title: "two labels", body: "", labels: ["flowstate:report", "status:triaged", "status:discarded"], state: "CLOSED" },
      { number: 3, title: "fine", body: "", labels: ["flowstate:report", "status:triaged"], state: "CLOSED" },
    );
    state.nextNumber = 4;
    await stub.writeState(state);

    const result = await taskDoctorGithub(store);
    expect(result.scanned).toBe(3);
    expect(result.fixed).toEqual([]);
    expect(result.invalid.map((i) => i.id)).toEqual(["#1", "#2"]);
    expect(result.invalid[0]?.reason).toMatch(/no final-state label/);
    expect(result.invalid[1]?.reason).toMatch(/status:triaged, status:discarded/);
    expect(result.invalid[0]?.path).toBe(`https://github.com/${stub.repo}/issues/1`);
  });
});
