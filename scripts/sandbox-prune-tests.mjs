#!/usr/bin/env node
// Live test harness for /dev-workflow:prune-tests. The skill refuses a dirty
// tree and this repo is rarely clean, so it runs against a throwaway git repo
// seeded with known test smells, using the plugin source rather than the
// installed copy.
//
//   pnpm sandbox:prune-tests          build, fresh sandbox, open Claude, check
//   pnpm sandbox:prune-tests setup    fresh sandbox only
//   pnpm sandbox:prune-tests check    re-check the current sandbox
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createGitSandbox, gitInvariantFailures, runHarness, sandboxDir, suiteFailures } from "./sandbox-lib.mjs";

export const DEFAULT_DIR = sandboxDir("prune-tests");
export const GUARD_TEST = "retry gives up after the limit";

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

// Commits are backdated so the skipped test is stale (6+ months) and the
// retry test carries a `fix:` commit that the never-flag rule must honour.
export function createSandbox(dir = DEFAULT_DIR) {
  return createGitSandbox(dir, [
    { files: INITIAL_FILES, message: "feat: initial lib and tests", date: "2025-01-10T10:00:00" },
    { files: FIX_FILES, message: "fix: retry stops after the limit (RPT-007)", date: "2025-02-01T10:00:00" },
  ]);
}

// Invariants that hold whatever labels the user approved.
export function checkSandbox(dir = DEFAULT_DIR) {
  const { failures, changed } = gitInvariantFailures(dir, { allowedPrefix: "test/" });
  let retrySource = "";
  try {
    retrySource = readFileSync(join(dir, "test", "retry.test.mjs"), "utf-8");
  } catch {
    failures.push("test/retry.test.mjs was deleted; it guards the RPT-007 fix");
  }
  if (retrySource && !retrySource.includes(GUARD_TEST)) {
    failures.push(`"${GUARD_TEST}" was removed; it guards the RPT-007 fix`);
  }
  failures.push(...suiteFailures(dir));
  return { ok: failures.length === 0, failures, changed };
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(
    runHarness({
      pluginName: "dev-workflow",
      skill: "prune-tests",
      dir: DEFAULT_DIR,
      create: createSandbox,
      check: checkSandbox,
      printExpectations,
      passMessage: "no commit, nothing staged, only test files changed, guard test kept, suite green",
      mode: process.argv[2],
    }),
  );
}
