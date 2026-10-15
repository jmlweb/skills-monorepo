#!/usr/bin/env node
// Live test harness for /dev-workflow:prune-tests. The skill refuses a dirty
// tree and this repo is rarely clean, so it runs against a throwaway git repo
// seeded with known test smells, using the plugin source rather than the
// installed copy.
//
//   pnpm sandbox:prune-tests          build, fresh sandbox, open Claude, check
//   pnpm sandbox:prune-tests setup    fresh sandbox only
//   pnpm sandbox:prune-tests check    re-check the current sandbox
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_DIR = join(ROOT, "plugins", "dev-workflow");
export const DEFAULT_DIR = join(tmpdir(), "skills-monorepo-sandboxes", "prune-tests");
export const GUARD_TEST = "retry gives up after the limit";
const BASE_FILE = join(".git", "sandbox-base");

// Each planted smell maps to one expected candidate; see the expectations
// printed by `printExpectations`.
const INITIAL_FILES = {
  "package.json": `{ "name": "prune-sandbox", "type": "module", "private": true, "scripts": { "test": "node --test" } }\n`,
  "src/lib.mjs": `export const add = (a, b) => a + b;
export const slugify = (s) => s.trim().toLowerCase().replace(/\\s+/g, "-");
export const delay = (ms) => new Promise((r) => setTimeout(r, ms));
export async function retry(fn, times) {
  for (let i = 0; i < times; i++) {
    try { return await fn(); } catch { await delay(10); }
  }
  throw new Error("retry exhausted");
}
`,
  "test/lib.test.mjs": `import { test } from "node:test";
import assert from "node:assert/strict";
import { add, slugify, delay } from "../src/lib.mjs";

test("adds small numbers", () => { assert.equal(add(1, 2), 3); });
test("adds large numbers", () => { assert.equal(add(100, 200), 300); });
test("adds negatives", () => { assert.equal(add(-1, -2), -3); });

test("slugifies a title", () => { assert.equal(slugify("Hello World"), "hello-world"); });
test("slugifies a title again", () => { assert.equal(slugify("Hello World"), "hello-world"); });

test("sanity", () => { assert.equal(true, true); });
test("calls slugify", () => { slugify("x"); });

test("waits before checking", async () => { await delay(300); assert.equal(add(2, 2), 4); });
`,
  "test/add-only.test.mjs": `import { test } from "node:test";
import assert from "node:assert/strict";
import { add } from "../src/lib.mjs";

test("add works", () => { assert.equal(add(2, 3), 5); });
`,
};

const FIX_FILES = {
  "test/retry.test.mjs": `import { test } from "node:test";
import assert from "node:assert/strict";
import { retry } from "../src/lib.mjs";

test("${GUARD_TEST}", async () => {
  await assert.rejects(retry(() => { throw new Error("x"); }, 2), /retry exhausted/);
});
test("retry flaky path", { skip: true }, () => {});
`,
};

function git(dir, args, env = {}) {
  return execFileSync(
    "git",
    ["-c", "user.name=sandbox", "-c", "user.email=sandbox@example.invalid", "-c", "commit.gpgsign=false", ...args],
    { cwd: dir, encoding: "utf-8", env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] },
  ).trimEnd(); // porcelain lines start with a meaningful space
}

function writeFiles(dir, files) {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
}

// Commits are backdated so the skipped test is stale (6+ months) and the
// retry test carries a `fix:` commit that the never-flag rule must honour.
export function createSandbox(dir = DEFAULT_DIR) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFiles(dir, INITIAL_FILES);
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["add", "-A"]);
  const date = (d) => ({ GIT_AUTHOR_DATE: d, GIT_COMMITTER_DATE: d });
  git(dir, ["commit", "-q", "-m", "feat: initial lib and tests"], date("2025-01-10T10:00:00"));
  writeFiles(dir, FIX_FILES);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "fix: retry stops after the limit (RPT-007)"], date("2025-02-01T10:00:00"));
  const head = git(dir, ["rev-parse", "HEAD"]);
  writeFileSync(join(dir, BASE_FILE), head);
  return head;
}

// Invariants that hold whatever labels the user approved.
export function checkSandbox(dir = DEFAULT_DIR) {
  const failures = [];
  const base = readFileSync(join(dir, BASE_FILE), "utf-8").trim();
  if (git(dir, ["rev-parse", "HEAD"]) !== base) failures.push("a commit was made; the skill must never commit");
  const staged = git(dir, ["diff", "--cached", "--name-only"]);
  if (staged) failures.push(`files are staged: ${staged.split("\n").join(", ")}`);
  const status = git(dir, ["status", "--porcelain"]).split("\n").filter(Boolean);
  const untracked = status.filter((line) => line.startsWith("??")).map((line) => line.slice(3));
  if (untracked.length) failures.push(`untracked files left behind: ${untracked.join(", ")}`);
  const outsideTests = status.map((line) => line.slice(3)).filter((path) => !path.startsWith("test/"));
  if (outsideTests.length) failures.push(`non-test files changed: ${outsideTests.join(", ")}`);
  let retrySource = "";
  try {
    retrySource = readFileSync(join(dir, "test", "retry.test.mjs"), "utf-8");
  } catch {
    failures.push("test/retry.test.mjs was deleted; it guards the RPT-007 fix");
  }
  if (retrySource && !retrySource.includes(GUARD_TEST)) {
    failures.push(`"${GUARD_TEST}" was removed; it guards the RPT-007 fix`);
  }
  const run = spawnSync("node", ["--test"], { cwd: dir, encoding: "utf-8" });
  if (run.status !== 0) failures.push("suite fails after the changes (node --test)");
  return { ok: failures.length === 0, failures, changed: status };
}

function printExpectations() {
  console.log(`Expected candidates (labels may be numbered differently):
  C  add-only.test.mjs        coverage subset of lib.test.mjs (weak signal)
  C  "slugifies a title again" exact duplicate
  C  "sanity"                  trivial assertion
  C  "calls slugify"           clutter: no assertion
  C  "retry flaky path"        clutter: skipped, stale since 2025-02
  R  add tests                 fold into a table (--claim fold), coverage 0 lost
  R  "waits before checking"   mock timers (--claim time), coverage 0 lost
  never: "${GUARD_TEST}" (fix: commit, RPT-007)
`);
}

function printCheck(result) {
  console.log(`\nChanged files:\n${result.changed.map((l) => `  ${l}`).join("\n") || "  (none)"}`);
  if (result.ok) {
    console.log("\nPASS  no commit, nothing staged, only test files changed, guard test kept, suite green");
  } else {
    console.log(`\nFAIL\n${result.failures.map((f) => `  - ${f}`).join("\n")}`);
  }
}

function main(mode) {
  if (mode === "check") {
    const result = checkSandbox();
    printCheck(result);
    return result.ok ? 0 : 1;
  }
  if (mode !== "setup") {
    const build = spawnSync("pnpm", ["build"], { cwd: PLUGIN_DIR, stdio: "inherit" });
    if (build.status !== 0) return 2;
  }
  createSandbox();
  console.log(`Sandbox ready: ${DEFAULT_DIR}`);
  printExpectations();
  if (mode === "setup") return 0;
  spawnSync("claude", ["--plugin-dir", PLUGIN_DIR, "/dev-workflow:prune-tests"], {
    cwd: DEFAULT_DIR,
    stdio: "inherit",
  });
  const result = checkSandbox();
  printCheck(result);
  return result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv[2]));
}
