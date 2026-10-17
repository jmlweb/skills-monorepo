import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkSandbox, createSandbox } from "./sandbox-kickstart.mjs";
import { writeFiles } from "./sandbox-lib.mjs";

function withSandbox(fn) {
  const dir = mkdtempSync(join(tmpdir(), "kickstart-sandbox-"));
  try {
    createSandbox(dir);
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const ADR = `# 0001. Process G-code as a stream

**Status:** accepted

## Context
Users slice the tower in PrusaSlicer; OrcaSlicer already ships a native generator.

## Decision
A pure function over parsed G-code lines rewrites temperatures per band.

## Consequences
- Works offline.
`;

// The end state a successful kickstart run leaves behind.
function kickstarted(dir, { adr = ADR } = {}) {
  writeFiles(dir, {
    "docs/evaluation.md": "# Evaluation\n",
    "docs/overview.md": "# Overview\n",
    "docs/adr/0001-process-gcode-as-a-stream.md": adr,
    "AGENTS.md": "# AGENTS.md\n",
    ".backlog/tasks/pending/TSK-001-walking-skeleton.md": "---\nid: TSK-001\n---\n",
  });
  symlinkSync("AGENTS.md", join(dir, "CLAUDE.md"));
}

test("a fresh sandbox fails every file invariant and only those", () => {
  withSandbox((dir) => {
    const { failures } = checkSandbox(dir);
    assert.ok(failures.some((f) => f.includes("no ADR files")));
    assert.ok(failures.some((f) => f.includes("CLAUDE.md is missing")));
    assert.ok(failures.some((f) => f.includes("no tasks")));
    assert.ok(!failures.some((f) => f.includes("commit")));
  });
});

test("a complete run passes, and domain products in an ADR are allowed", () => {
  withSandbox((dir) => {
    kickstarted(dir);
    assert.deepEqual(checkSandbox(dir).failures, []);
  });
});

test("flags an ADR that names a library", () => {
  withSandbox((dir) => {
    kickstarted(dir, { adr: ADR.replace("A pure function", "A Flask service with a pure function") });
    const { failures } = checkSandbox(dir);
    assert.ok(failures.some((f) => f.includes("names a library or framework: flask")));
  });
});

test("flags a CLAUDE.md that is a regular file", () => {
  withSandbox((dir) => {
    kickstarted(dir);
    rmSync(join(dir, "CLAUDE.md"));
    writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n");
    assert.ok(checkSandbox(dir).failures.includes("CLAUDE.md is not a symlink"));
  });
});

test("flags a run that seeded no tasks", () => {
  withSandbox((dir) => {
    kickstarted(dir);
    rmSync(join(dir, ".backlog", "tasks", "pending", "TSK-001-walking-skeleton.md"));
    assert.ok(checkSandbox(dir).failures.some((f) => f.includes("no tasks")));
  });
});
