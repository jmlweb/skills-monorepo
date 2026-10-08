import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./check-backlog-integrity.mjs", import.meta.url));
const builtPlugin = fileURLToPath(new URL("../plugins/flowstate/dist", import.meta.url));

let root;

// Seeds a real backlog through the CLI so the fixture can never drift from
// what the CLI actually writes.
function cli(...args) {
  const run = spawnSync("node", [join(root, "plugins/flowstate/dist/bin/flowstate.js"), ...args], {
    cwd: root,
    encoding: "utf-8",
  });
  assert.equal(run.status, 0, run.stderr);
  return run.stdout;
}

function check() {
  const run = spawnSync("node", [script, root], { encoding: "utf-8" });
  return { status: run.status, out: run.stdout, err: run.stderr };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "backlog-integrity-test-"));
  mkdirSync(join(root, "plugins/flowstate"), { recursive: true });
  cpSync(builtPlugin, join(root, "plugins/flowstate/dist"), { recursive: true });
  writeFileSync(join(root, "plugins/flowstate/package.json"), '{"type":"module"}');
  cli("setup");
  cli("task-create", "--title", "First task", "--priority", "P2");
  cli("task-create", "--title", "Second task", "--priority", "P3");
  // task-create does not touch index.md; rebuild gives the canonical baseline.
  cli("index-rebuild");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function pendingFile() {
  return readdirSync(join(root, ".backlog/tasks/pending")).find((n) => n.startsWith("TSK-001"));
}

test("passes on a clean backlog", () => {
  const { status, out } = check();
  assert.equal(status, 0);
  assert.match(out, /consistent/);
});

test("fails when index.md is hand-edited, without touching the real backlog", () => {
  const indexPath = join(root, ".backlog/tasks/index.md");
  const edited = readFileSync(indexPath, "utf-8").replace("First task", "Sneaky edit");
  writeFileSync(indexPath, edited);

  const { status, err } = check();
  assert.equal(status, 1);
  assert.match(err, /\.backlog\/tasks\/index\.md: differs from/);
  assert.equal(readFileSync(indexPath, "utf-8"), edited, "check must not rewrite the real index");
});

test("reports a status/folder mismatch naming the file", () => {
  const file = pendingFile();
  const path = join(root, ".backlog/tasks/pending", file);
  writeFileSync(path, readFileSync(path, "utf-8").replace("status: pending", "status: complete"));

  const { status, err } = check();
  assert.equal(status, 1);
  assert.match(err, new RegExp(`tasks/pending/${file}: status "complete" does not belong in tasks/pending/`));
});

test("reports a file moved to another folder without updating status", () => {
  const file = pendingFile();
  renameSync(join(root, ".backlog/tasks/pending", file), join(root, ".backlog/tasks/active", file));

  const { status, err } = check();
  assert.equal(status, 1);
  assert.match(err, new RegExp(`tasks/active/${file}: status "pending"`));
});

test("accepts blocked tasks under tasks/active", () => {
  cli("task-move", "TSK-001", "--to", "active");
  cli("task-block", "TSK-001", "--reason", "waiting");
  cli("index-rebuild");
  const { status, err } = check();
  assert.equal(status, 0, err);
});

test("missing backlog directory is an explicit error, not a pass", () => {
  rmSync(join(root, ".backlog"), { recursive: true });
  const { status, err } = check();
  assert.equal(status, 2);
  assert.match(err, /No backlog directory/);
});

test("missing entity folder is an explicit error", () => {
  rmSync(join(root, ".backlog/ideas/pending"), { recursive: true });
  const { status, err } = check();
  assert.equal(status, 2);
  assert.match(err, /Missing backlog folder/);
});

test("unbuilt CLI is an explicit error", () => {
  rmSync(join(root, "plugins/flowstate/dist"), { recursive: true });
  const { status, err } = check();
  assert.equal(status, 2);
  assert.match(err, /CLI not built/);
});
