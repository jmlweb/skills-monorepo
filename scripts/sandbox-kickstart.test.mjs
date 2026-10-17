import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkSandbox, createSandbox, decisionSection } from "./sandbox-kickstart.mjs";
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

const EVALUATION = `# Evaluation: temp-tower

**Feasibility:** feasible — G-code is plain text
**Build:** build with changes — target PrusaSlicer only; OrcaSlicer covers its own users
**Goal:** portfolio — linked from the CV by 2026-12-01
`;

const task = (id, dependsOn = "") => `---\nid: ${id}\nstatus: pending\ndepends-on: [${dependsOn}]\n---\n`;

// The end state a successful kickstart run leaves behind.
function kickstarted(dir, { adr = ADR } = {}) {
  writeFiles(dir, {
    "docs/evaluation.md": EVALUATION,
    "docs/overview.md": "# Overview\n",
    "docs/adr/0001-process-gcode-as-a-stream.md": adr,
    "AGENTS.md": "# AGENTS.md\n",
    ".backlog/tasks/pending/TSK-001-test-the-riskiest-assumption.md": task("TSK-001"),
    ".backlog/tasks/pending/TSK-002-rewrite-one-band.md": task("TSK-002", "TSK-001"),
    ".backlog/tasks/pending/TSK-003-rewrite-every-band.md": task("TSK-003", "TSK-002"),
  });
  symlinkSync("AGENTS.md", join(dir, "CLAUDE.md"));
}

const replaceClaudeMd = (dir, make) => {
  rmSync(join(dir, "CLAUDE.md"));
  make(join(dir, "CLAUDE.md"));
};

test("a fresh sandbox fails every file invariant and never the commit check", () => {
  withSandbox((dir) => {
    const { failures } = checkSandbox(dir);
    for (const expected of [
      "docs/evaluation.md is missing",
      "docs/overview.md is missing",
      "AGENTS.md is missing",
      "no ADR files",
      "CLAUDE.md is missing",
      "0 tasks",
    ]) {
      assert.ok(failures.some((f) => f.includes(expected)), `missing failure: ${expected}`);
    }
    assert.ok(!failures.some((f) => f.includes("commit")));
  });
});

test("a complete run passes, and domain products in an ADR Context are allowed", () => {
  withSandbox((dir) => {
    kickstarted(dir);
    assert.deepEqual(checkSandbox(dir).failures, []);
  });
});

test("a library named only in Context passes; one in Decision fails", () => {
  withSandbox((dir) => {
    kickstarted(dir, { adr: ADR.replace("Users slice", "Flask was considered and dropped. Users slice") });
    assert.deepEqual(checkSandbox(dir).failures, []);
  });
  withSandbox((dir) => {
    kickstarted(dir, { adr: ADR.replace("A pure function", "A Flask service with a pure function") });
    assert.ok(checkSandbox(dir).failures.some((f) => f.includes("Decision names a library or framework: flask")));
  });
});

test("decisionSection stops at the next heading and at the end of the file", () => {
  assert.equal(decisionSection(ADR).trim(), "A pure function over parsed G-code lines rewrites temperatures per band.");
  assert.equal(decisionSection("## Decision\nlast section\n").trim(), "last section");
  assert.equal(decisionSection("# no decision\n"), "");
});

test("flags a proposed ADR and an evaluation without verdict lines", () => {
  withSandbox((dir) => {
    kickstarted(dir, { adr: ADR.replace("**Status:** accepted", "**Status:** proposed") });
    writeFileSync(join(dir, "docs", "evaluation.md"), "# Evaluation\n\nLooks feasible.\n");
    const { failures } = checkSandbox(dir);
    assert.ok(failures.some((f) => f.includes("is not accepted")));
    assert.ok(failures.includes("docs/evaluation.md has no Feasibility verdict line"));
    assert.ok(failures.includes("docs/evaluation.md has no Build verdict line"));
  });
});

test("accepts the @AGENTS.md pointer fallback; flags other files and wrong symlink targets", () => {
  withSandbox((dir) => {
    kickstarted(dir);
    replaceClaudeMd(dir, (path) => writeFileSync(path, "@AGENTS.md\n"));
    assert.deepEqual(checkSandbox(dir).failures, []);
    replaceClaudeMd(dir, (path) => writeFileSync(path, "# Rules\n"));
    assert.ok(checkSandbox(dir).failures.some((f) => f.includes("neither a symlink")));
    replaceClaudeMd(dir, (path) => symlinkSync("README.md", path));
    assert.ok(checkSandbox(dir).failures.includes("CLAUDE.md links to README.md, expected AGENTS.md"));
  });
});

test("flags too few tasks and tasks without any depends-on link", () => {
  withSandbox((dir) => {
    kickstarted(dir);
    rmSync(join(dir, ".backlog", "tasks", "pending", "TSK-003-rewrite-every-band.md"));
    assert.ok(checkSandbox(dir).failures.some((f) => f.includes("2 tasks") && f.includes("expected 3-8")));
  });
  withSandbox((dir) => {
    kickstarted(dir);
    writeFiles(dir, {
      ".backlog/tasks/pending/TSK-002-rewrite-one-band.md": task("TSK-002"),
      ".backlog/tasks/pending/TSK-003-rewrite-every-band.md": task("TSK-003"),
    });
    assert.ok(checkSandbox(dir).failures.includes("no seeded task has a depends-on link"));
  });
});
