import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGitSandbox, git, gitInvariantFailures } from "./sandbox-lib.mjs";

function withSandbox(fn) {
  const dir = mkdtempSync(join(tmpdir(), "sandbox-lib-"));
  try {
    createGitSandbox(dir, [
      { files: { "a/one.txt": "1\n" }, message: "feat: one", date: "2025-01-01T10:00:00" },
      { files: { "a/two.txt": "2\n" }, message: "fix: two", date: "2025-02-01T10:00:00" },
    ]);
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("commits land in order with their backdated dates", () => {
  withSandbox((dir) => {
    assert.equal(git(dir, ["log", "--format=%cs %s"]), "2025-02-01 fix: two\n2025-01-01 feat: one");
  });
});

test("a clean fixture has no invariant failures", () => {
  withSandbox((dir) => {
    assert.deepEqual(gitInvariantFailures(dir, { allowedPrefix: "a/" }), { failures: [], changed: [] });
  });
});

test("flags a new commit, a staged file, a stray file and an edit outside the prefix", () => {
  withSandbox((dir) => {
    writeFileSync(join(dir, "outside.txt"), "x\n");
    git(dir, ["add", "outside.txt"]);
    writeFileSync(join(dir, "stray.txt"), "y\n");
    const { failures } = gitInvariantFailures(dir, { allowedPrefix: "a/" });
    assert.ok(failures.some((f) => f.startsWith("files are staged")));
    assert.ok(failures.some((f) => f.startsWith("untracked files left behind")));
    assert.ok(failures.some((f) => f.startsWith("files outside a/ changed")));
    git(dir, ["commit", "-q", "-m", "chore: sneaky"]);
    assert.ok(gitInvariantFailures(dir).failures.some((f) => f.includes("must never commit")));
  });
});
