#!/usr/bin/env node
// Live test harness for /dev-workflow:harden. The fixture's history holds one
// `fix:` for a zero denominator, and the planted bug repeats that class in a
// helper the fix missed, so the run must find it from the repo's own history.
//
//   pnpm sandbox:harden          build, fresh sandbox, open Claude, check
//   pnpm sandbox:harden setup    fresh sandbox only
//   pnpm sandbox:harden check    re-check the current sandbox
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createGitSandbox, git, gitInvariantFailures, runHarness, sandboxDir, suiteFailures } from "./sandbox-lib.mjs";

export const DEFAULT_DIR = sandboxDir("harden");
export const TARGET = "src/stats.mjs";
const TEST_FILE = "test/stats.test.mjs";

const BUGGY_RATIO = `export const ratio = (part, whole) => part / whole;
`;
const FIXED_RATIO = `export function ratio(part, whole) {
  if (whole === 0) throw new RangeError("zero denominator");
  return part / whole;
}
`;
const PERCENTAGE = `
export const percentage = (part, whole) => (part / whole) * 100;
`;

const BASE_FILES = {
  "package.json": `{ "name": "harden-sandbox", "type": "module", "private": true, "scripts": { "test": "node --test" } }\n`,
  "README.md": `# stats\n\nEvery helper throws RangeError on a zero denominator.\n`,
  [TARGET]: BUGGY_RATIO,
  [TEST_FILE]: `import { test } from "node:test";
import assert from "node:assert/strict";
import { ratio } from "../src/stats.mjs";

test("ratio divides", () => { assert.equal(ratio(1, 2), 0.5); });
`,
};

const FIX_FILES = {
  [TARGET]: FIXED_RATIO,
  [TEST_FILE]: `import { test } from "node:test";
import assert from "node:assert/strict";
import { ratio } from "../src/stats.mjs";

test("ratio divides", () => { assert.equal(ratio(1, 2), 0.5); });
test("ratio rejects a zero denominator", () => { assert.throws(() => ratio(1, 0), RangeError); });
`,
};

const FEATURE_FILES = {
  [TARGET]: FIXED_RATIO + PERCENTAGE,
  [TEST_FILE]: `import { test } from "node:test";
import assert from "node:assert/strict";
import { percentage, ratio } from "../src/stats.mjs";

test("ratio divides", () => { assert.equal(ratio(1, 2), 0.5); });
test("ratio rejects a zero denominator", () => { assert.throws(() => ratio(1, 0), RangeError); });
test("percentage scales", () => { assert.equal(percentage(1, 4), 25); });
`,
};

export function createSandbox(dir = DEFAULT_DIR) {
  return createGitSandbox(dir, [
    { files: BASE_FILES, message: "feat: add ratio helper", date: "2025-01-10T10:00:00" },
    { files: FIX_FILES, message: "fix: reject a zero denominator in ratio", date: "2025-01-20T10:00:00" },
    { files: FEATURE_FILES, message: "feat: add percentage helper", date: "2025-02-01T10:00:00" },
  ]);
}

const testFiles = (changed) => changed.map((line) => line.slice(3)).filter((path) => path.startsWith("test/"));

// The attack tests must fail on the source as committed, or they prove nothing.
function attackFailsOnOriginalSource(dir) {
  const copy = mkdtempSync(join(tmpdir(), "harden-proof-"));
  try {
    cpSync(dir, copy, { recursive: true });
    git(copy, ["checkout", "HEAD", "--", "src"]);
    // An inherited NODE_TEST_CONTEXT makes a nested `node --test` exit 0 on failure.
    const { NODE_TEST_CONTEXT: _nested, ...env } = process.env;
    return spawnSync("node", ["--test"], { cwd: copy, encoding: "utf-8", env }).status !== 0;
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}

function percentageRejectsZero(dir) {
  const script = `import(${JSON.stringify(join(dir, TARGET))}).then(({ percentage }) => {
    try { percentage(1, 0); process.exit(1); } catch (e) { process.exit(e instanceof RangeError ? 0 : 1); }
  });`;
  return spawnSync("node", ["-e", script], { encoding: "utf-8" }).status === 0;
}

// Invariants that hold however many extra attack tests the run keeps.
export function checkSandbox(dir = DEFAULT_DIR) {
  const { failures, changed } = gitInvariantFailures(dir, { untrackedPrefix: "test/" });
  const outside = changed.map((line) => line.slice(3)).filter((p) => p !== TARGET && !p.startsWith("test/"));
  if (outside.length) failures.push(`files outside ${TARGET} and test/ changed: ${outside.join(", ")}`);
  const tests = testFiles(changed);
  if (tests.length === 0) {
    failures.push("no attack test was written");
  } else if (!attackFailsOnOriginalSource(dir)) {
    failures.push("attack tests pass on the original source; they do not prove the bug");
  }
  if (!percentageRejectsZero(dir)) failures.push("percentage(1, 0) still does not throw RangeError");
  const originalTests = git(dir, ["show", `HEAD:${TEST_FILE}`]).split("\n");
  const currentTests = readFileSync(join(dir, TEST_FILE), "utf-8").split("\n");
  const removed = originalTests.filter((line) => line && !currentTests.includes(line));
  if (removed.length) failures.push(`existing test lines changed: ${removed.join(" | ")}`);
  failures.push(...suiteFailures(dir));
  return { ok: failures.length === 0, failures, changed };
}

function printExpectations() {
  console.log(`Expected:
  class       zero denominator, citing the "fix: reject a zero denominator in ratio" commit
  bug         percentage(1, 0) returns Infinity; README says RangeError
  order       attack test fails first, then the fix
  verdict     ${TARGET}: hardened
The skill is run with target ${TARGET}.
`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(
    runHarness({
      pluginName: "dev-workflow",
      skill: "harden",
      args: TARGET,
      dir: DEFAULT_DIR,
      create: createSandbox,
      check: checkSandbox,
      printExpectations,
      passMessage: "no commit, bug proven by a test that fails on the original source, assertions intact, suite green",
      mode: process.argv[2],
    }),
  );
}
