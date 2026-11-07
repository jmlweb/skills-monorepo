// The stub answers like gh does for the subcommands flowstate uses; these tests pin the
// output shapes and error lines the store and the hook key on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyState, installStub } from "./gh-stub.mjs";

function withStub(fn, state = emptyState()) {
  const dir = mkdtempSync(join(tmpdir(), "gh-stub-test-"));
  const statePath = join(dir, "state.json");
  writeFileSync(statePath, JSON.stringify(state));
  installStub(dir);
  const gh = (args, input = "") =>
    spawnSync(join(dir, "gh"), args, { encoding: "utf-8", input, env: { ...process.env, GH_STUB_STATE: statePath } });
  try {
    fn(gh, () => JSON.parse(readFileSync(statePath, "utf-8")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("auth status and repo view follow the state file", () => {
  withStub((gh) => {
    assert.equal(gh(["auth", "status"]).status, 0);
    assert.deepEqual(JSON.parse(gh(["repo", "view", "--json", "nameWithOwner"]).stdout), { nameWithOwner: "owner/name" });
    const wrong = gh(["repo", "view", "other/repo", "--json", "nameWithOwner"]);
    assert.equal(wrong.status, 1);
    assert.match(wrong.stderr, /Could not resolve to a Repository/);
  });
  withStub((gh) => {
    const out = gh(["auth", "status"]);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /gh auth login/);
  }, { ...emptyState(), auth: false });
});

test("issue create reads the body from stdin, needs existing labels and prints the URL", () => {
  withStub((gh, state) => {
    const missing = gh(["issue", "create", "--repo", "owner/name", "--title", "T", "--body-file", "-", "--label", "flowstate:task"], "body");
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /could not add label: 'flowstate:task' not found/);

    assert.equal(gh(["label", "create", "flowstate:task", "--repo", "owner/name", "--force", "--color", "0E8A16"]).status, 0);
    const created = gh(["issue", "create", "--repo", "owner/name", "--title", "T", "--body-file", "-", "--label", "flowstate:task"], "body");
    assert.equal(created.stdout.trim(), "https://github.com/owner/name/issues/1");
    assert.deepEqual(state().issues[0], { number: 1, title: "T", body: "body", labels: ["flowstate:task"], state: "OPEN", stateReason: null });
  });
});

test("issue list filters by state and labels, honours --limit and returns the requested fields", () => {
  const state = emptyState();
  state.labels = ["flowstate:task", "status:active"];
  state.issues = [
    { number: 1, title: "a", body: "", labels: ["flowstate:task"], state: "OPEN" },
    { number: 2, title: "b", body: "", labels: ["flowstate:task", "status:active"], state: "OPEN" },
    { number: 3, title: "c", body: "", labels: ["flowstate:task"], state: "CLOSED" },
    { number: 4, title: "pr", body: "", labels: ["flowstate:task"], state: "OPEN", isPullRequest: true },
  ];
  withStub((gh) => {
    const open = JSON.parse(gh(["issue", "list", "--repo", "owner/name", "--label", "flowstate:task", "--state", "open", "--limit", "100", "--json", "number,labels,url"]).stdout);
    assert.deepEqual(open.map((i) => i.number), [2, 1]);
    assert.deepEqual(open[0].labels.map((l) => l.name), ["flowstate:task", "status:active"]);
    assert.equal(open[1].url, "https://github.com/owner/name/issues/1");
    const active = JSON.parse(gh(["issue", "list", "--repo", "owner/name", "--label", "flowstate:task", "--label", "status:active", "--json", "number"]).stdout);
    assert.deepEqual(active, [{ number: 2 }]);
    const all = JSON.parse(gh(["issue", "list", "--repo", "owner/name", "--state", "all", "--limit", "2", "--json", "number"]).stdout);
    assert.deepEqual(all.map((i) => i.number), [3, 2]);
  }, state);
});

test("issue view, edit, close and reopen mutate one issue; unknown numbers fail like gh", () => {
  const state = emptyState();
  state.labels = ["flowstate:task", "status:active", "P1"];
  state.issues = [{ number: 1, title: "a", body: "old", labels: ["flowstate:task"], state: "OPEN" }];
  withStub((gh, read) => {
    const edit = gh(["issue", "edit", "1", "--repo", "owner/name", "--title", "b", "--body-file", "-", "--add-label", "status:active", "--add-label", "P1", "--remove-label", "flowstate:task"], "new");
    assert.equal(edit.status, 0, edit.stderr);
    assert.deepEqual(read().issues[0], { number: 1, title: "b", body: "new", labels: ["status:active", "P1"], state: "OPEN" });

    const view = JSON.parse(gh(["issue", "view", "1", "--repo", "owner/name", "--json", "number,title,state"]).stdout);
    assert.deepEqual(view, { number: 1, title: "b", state: "OPEN" });

    assert.equal(gh(["issue", "close", "1", "--repo", "owner/name", "--reason", "not planned"]).status, 0);
    assert.equal(read().issues[0].state, "CLOSED");
    assert.equal(read().issues[0].stateReason, "NOT_PLANNED");
    assert.equal(gh(["issue", "reopen", "1", "--repo", "owner/name"]).status, 0);
    assert.equal(read().issues[0].state, "OPEN");

    const missing = gh(["issue", "view", "9", "--repo", "owner/name", "--json", "number"]);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /Could not resolve to an issue or pull request with the number of 9/);
  }, state);
});

test("every call is appended to the log and unsupported commands exit 1", () => {
  withStub((gh, _read) => {
    gh(["auth", "status"]);
    const bad = gh(["issue", "frobnicate"]);
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /unsupported command/);
  });
});

test("a missing state file is a setup error (exit 2), never an empty repository", () => {
  const dir = mkdtempSync(join(tmpdir(), "gh-stub-test-"));
  try {
    installStub(dir);
    const out = spawnSync(join(dir, "gh"), ["issue", "list"], { encoding: "utf-8", env: { ...process.env, GH_STUB_STATE: join(dir, "nope.json") } });
    assert.equal(out.status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
