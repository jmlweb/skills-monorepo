import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkSandbox, createSandbox, PREEXISTING_COMMENT } from "./sandbox-deslop.mjs";

function withSandbox(fn) {
  const dir = mkdtempSync(join(tmpdir(), "deslop-sandbox-"));
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

test("a fresh sandbox is on feature with main as the base and passes every invariant", () => {
  withSandbox((dir) => {
    const branch = execFileSync("git", ["branch", "--show-current"], { cwd: dir, encoding: "utf-8" }).trim();
    const ahead = execFileSync("git", ["rev-list", "--count", "main..HEAD"], { cwd: dir, encoding: "utf-8" }).trim();
    assert.equal(branch, "feature");
    assert.equal(ahead, "1");
    assert.deepEqual(checkSandbox(dir).failures, []);
  });
});

test("removing flagged comments passes", () => {
  withSandbox((dir) => {
    edit(dir, "src/cart.mjs", (text) =>
      text.replace("  // initialize sum to zero\n", "").replace("// ===== end =====\n", ""),
    );
    assert.equal(checkSandbox(dir).ok, true);
  });
});

test("flags a removed why-comment and an edit to code", () => {
  withSandbox((dir) => {
    edit(dir, "src/cart.mjs", (text) =>
      text.replace(/  \/\/ half-up.*\n/, "").replace("sum * (1 - pct / 100)", "sum - pct"),
    );
    const { failures } = checkSandbox(dir);
    assert.ok(failures.some((f) => f.includes("code lines changed")));
    assert.ok(failures.some((f) => f.includes("see RPT-012")));
  });
});

test("flags edits to pre-existing comments, generated files and Markdown", () => {
  withSandbox((dir) => {
    edit(dir, "src/math.mjs", (text) => text.replace(`${PREEXISTING_COMMENT}\n`, ""));
    edit(dir, "dist/bundle.js", (text) => text.replace(/\/\/.*\n/, ""));
    const { failures } = checkSandbox(dir);
    assert.ok(failures.some((f) => f.includes("pre-existing comment")));
    assert.ok(failures.some((f) => f.includes("files outside src/ changed") && f.includes("dist/bundle.js")));
  });
});
