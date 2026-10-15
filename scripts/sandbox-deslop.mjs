#!/usr/bin/env node
// Live test harness for /dev-workflow:deslop. The skill needs a clean tree and
// a branch that diverges from a base, so it runs against a throwaway repo whose
// `feature` branch adds known LLM-style comments, using the plugin source
// rather than the installed copy.
//
//   pnpm sandbox:deslop          build, fresh sandbox, open Claude, check
//   pnpm sandbox:deslop setup    fresh sandbox only
//   pnpm sandbox:deslop check    re-check the current sandbox
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createGitSandbox, git, gitInvariantFailures, runHarness, sandboxDir, suiteFailures } from "./sandbox-lib.mjs";

export const DEFAULT_DIR = sandboxDir("deslop");
// Why-comments the skill must keep, and the pre-existing slop it must leave alone.
export const KEEP_COMMENTS = ["see RPT-012", "never here"];
export const PREEXISTING_COMMENT = "// legacy helper to add numbers";

const BASE_FILES = {
  "package.json": `{ "name": "deslop-sandbox", "type": "module", "private": true, "scripts": { "test": "node --test" } }\n`,
  "src/math.mjs": `${PREEXISTING_COMMENT}
export const add = (a, b) => a + b;
`,
};

const FEATURE_FILES = {
  "src/cart.mjs": `// ===== Cart helpers =====
/**
 * @param items the items
 * @returns the result
 */
export function total(items) {
  // initialize sum to zero
  let sum = 0;
  for (const item of items) {
    // add the item price to sum
    sum += item.price * item.qty;
  }
  // robust, seamless total calculation
  return sum;
}

// updated to fix rounding bug
export function round2(n) {
  // half-up on purpose: invoices must match the ledger (see RPT-012)
  return Math.round(n * 100) / 100;
}

export function applyDiscount(sum, pct) {
  // pct is 0-100; legacy callers send 0-1 and are normalised upstream, never here
  return sum * (1 - pct / 100);
}
// ===== end =====
`,
  "test/cart.test.mjs": `import { test } from "node:test";
import assert from "node:assert/strict";
import { applyDiscount, round2, total } from "../src/cart.mjs";

test("total sums price times quantity", () => { assert.equal(total([{ price: 2, qty: 3 }]), 6); });
test("round2 keeps two decimals", () => { assert.equal(round2(1.234), 1.23); });
test("applyDiscount takes a percentage", () => { assert.equal(applyDiscount(100, 10), 90); });
`,
  // Out of scope for the skill: generated output and Markdown.
  "dist/bundle.js": `// robust bundle, now handles every case
export const bundled = true;
`,
  "NOTES.md": `<!-- updated to fix the intro -->
# Notes
`,
};

export function createSandbox(dir = DEFAULT_DIR) {
  return createGitSandbox(dir, [
    { files: BASE_FILES, message: "feat: initial math helper", date: "2025-01-10T10:00:00" },
    { files: FEATURE_FILES, message: "feat: add cart helpers", date: "2025-02-01T10:00:00", branch: "feature" },
  ]);
}

const COMMENT_START = /^(\/\/|\/\*|\*)/;
const codeLines = (text) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !COMMENT_START.test(line));

// Invariants that hold whatever selection the user approved.
export function checkSandbox(dir = DEFAULT_DIR) {
  const { failures, changed } = gitInvariantFailures(dir, { allowedPrefix: "src/" });
  for (const path of changed.map((line) => line.slice(3)).filter((p) => p.startsWith("src/"))) {
    const before = codeLines(git(dir, ["show", `HEAD:${path}`]));
    const after = codeLines(readFileSync(join(dir, path), "utf-8"));
    if (JSON.stringify(before) !== JSON.stringify(after)) failures.push(`${path}: code lines changed, not only comments`);
  }
  const cart = readFileSync(join(dir, "src", "cart.mjs"), "utf-8");
  for (const marker of KEEP_COMMENTS) {
    if (!cart.includes(marker)) failures.push(`why-comment removed: "${marker}"`);
  }
  if (!readFileSync(join(dir, "src", "math.mjs"), "utf-8").includes(PREEXISTING_COMMENT)) {
    failures.push("pre-existing comment in src/math.mjs was removed; it is outside the branch diff");
  }
  failures.push(...suiteFailures(dir));
  return { ok: failures.length === 0, failures, changed };
}

function printExpectations() {
  console.log(`Expected flagged (labels may be numbered differently), all in src/cart.mjs:
  restates    "initialize sum to zero", "add the item price to sum"
  boilerplate @param/@returns doc on total()
  change-log  "updated to fix rounding bug"
  banner      "===== Cart helpers =====", "===== end ====="
  marketing   "robust, seamless total calculation"
  keep        "(see RPT-012)", "never here"
  untouched   src/math.mjs legacy comment, dist/bundle.js, NOTES.md
Answer "all" at the prompt; the skill is run with base "main".
`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(
    runHarness({
      pluginName: "dev-workflow",
      skill: "deslop",
      args: "main",
      dir: DEFAULT_DIR,
      create: createSandbox,
      check: checkSandbox,
      printExpectations,
      passMessage: "no commit, nothing staged, only src/ comments changed, why-comments kept, suite green",
      mode: process.argv[2],
    }),
  );
}
