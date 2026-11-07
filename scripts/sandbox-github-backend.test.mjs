import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EXPECTED, checkIssues, main, parseArgs } from "./sandbox-github-backend.mjs";

test("nothing runs without --repo owner/name: usage and exit 2", () => {
  assert.match(parseArgs([]).error, /--repo is required/);
  assert.match(parseArgs(["--repo"]).error, /owner\/name/);
  assert.match(parseArgs(["--repo", "https://github.com/a/b"]).error, /owner\/name/);
  assert.deepEqual(parseArgs(["--repo", "acme/widgets"]), { repo: "acme/widgets" });

  const errors = [];
  const original = console.error;
  console.error = (line) => errors.push(line);
  try {
    assert.equal(main([]), 2);
  } finally {
    console.error = original;
  }
  assert.match(errors.join("\n"), /Usage: node scripts\/sandbox-github-backend.mjs --repo owner\/name/);
});

test("checkIssues accepts the expected end state and names every drift", () => {
  const good = {
    task: { number: 1, state: "CLOSED", labels: [{ name: "sandbox" }, { name: "P2" }, { name: "flowstate:task" }] },
    idea: { number: 2, state: "CLOSED", labels: [{ name: "flowstate:idea" }, { name: "status:approved" }] },
    report: { number: 3, state: "CLOSED", labels: [{ name: "flowstate:report" }, { name: "status:discarded" }] },
  };
  assert.deepEqual(checkIssues(good), []);

  const bad = {
    ...good,
    task: { ...good.task, state: "OPEN", labels: [{ name: "flowstate:task" }, { name: "P2" }, { name: "sandbox" }, { name: "status:active" }] },
    report: undefined,
  };
  const failures = checkIssues(bad);
  assert.equal(failures.length, 3);
  assert.match(failures[0], /task #1: state OPEN, expected CLOSED/);
  assert.match(failures[1], /task #1: labels \[P2, flowstate:task, sandbox, status:active\]/);
  assert.match(failures[2], /report: no issue was created/);
});

test("the expected end state mirrors the file-mode status model", () => {
  assert.deepEqual(Object.keys(EXPECTED), ["task", "idea", "report"]);
  assert.ok(EXPECTED.task.labels.every((l) => !l.startsWith("status:")), "a complete task carries no status label");
  assert.deepEqual(EXPECTED.idea.labels.filter((l) => l.startsWith("status:")), ["status:approved"]);
});

test("the script is wired as an opt-in package script and never into pnpm test", () => {
  const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf-8"));
  assert.equal(pkg.scripts["sandbox:github-backend"], "node scripts/sandbox-github-backend.mjs");
  assert.doesNotMatch(pkg.scripts.test, /sandbox/);
  assert.doesNotMatch(pkg.scripts["test:scripts"], /sandbox-github/);
});
