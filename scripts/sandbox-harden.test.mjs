import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkSandbox, createSandbox, TARGET } from "./sandbox-harden.mjs";
import { git } from "./sandbox-lib.mjs";

function withSandbox(fn) {
  const dir = mkdtempSync(join(tmpdir(), "harden-sandbox-"));
  try {
    createSandbox(dir);
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const edit = (dir, path, transform) => {
  const full = join(dir, path);
  writeFileSync(full, transform(readFileSync(full, "utf-8")));
};

const ATTACK_TEST = `import { test } from "node:test";
import assert from "node:assert/strict";
import { percentage } from "../src/stats.mjs";

test("percentage rejects a zero denominator", () => { assert.throws(() => percentage(1, 0), RangeError); });
`;

const fixPercentage = (dir) =>
  edit(dir, TARGET, (text) =>
    text.replace(
      "export const percentage = (part, whole) => (part / whole) * 100;",
      "export const percentage = (part, whole) => ratio(part, whole) * 100;",
    ),
  );

test("a fresh sandbox holds the fix history and fails only for missing work", () => {
  withSandbox((dir) => {
    assert.match(git(dir, ["log", "--format=%s"]), /fix: reject a zero denominator/);
    const { failures } = checkSandbox(dir);
    assert.deepEqual(failures, ["no attack test was written", "percentage(1, 0) still does not throw RangeError"]);
  });
});

test("a new attack test plus the fix passes", () => {
  withSandbox((dir) => {
    writeFileSync(join(dir, "test/attack.test.mjs"), ATTACK_TEST);
    fixPercentage(dir);
    assert.deepEqual(checkSandbox(dir).failures, []);
  });
});

test("flags a test that would pass on the original source", () => {
  withSandbox((dir) => {
    writeFileSync(join(dir, "test/attack.test.mjs"), ATTACK_TEST.replace(/test\(.*\n/, `test("noop", () => { assert.ok(percentage); });\n`));
    fixPercentage(dir);
    assert.ok(checkSandbox(dir).failures.some((f) => f.includes("do not prove the bug")));
  });
});

test("flags a weakened existing assertion", () => {
  withSandbox((dir) => {
    writeFileSync(join(dir, "test/attack.test.mjs"), ATTACK_TEST);
    fixPercentage(dir);
    edit(dir, "test/stats.test.mjs", (text) => text.replace("assert.equal(percentage(1, 4), 25);", "assert.ok(true);"));
    assert.ok(checkSandbox(dir).failures.some((f) => f.includes("existing test lines changed")));
  });
});

test("flags a commit and edits outside the target", () => {
  withSandbox((dir) => {
    writeFileSync(join(dir, "test/attack.test.mjs"), ATTACK_TEST);
    fixPercentage(dir);
    edit(dir, "README.md", (text) => `${text}\nExtra.\n`);
    assert.ok(checkSandbox(dir).failures.some((f) => f.includes("files outside")));
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "fix: percentage"]);
    assert.ok(checkSandbox(dir).failures.some((f) => f.includes("a commit was made")));
  });
});
