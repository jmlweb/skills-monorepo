import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkSandbox, createSandbox, decisionSection } from "./sandbox-kickstart.mjs";
import { git, writeFiles } from "./sandbox-lib.mjs";

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

## Need
Forum threads ask for per-band temperatures.
Why now: nothing changed

## Feasibility
Plain-text G-code, no slicer plugin needed.

## Market
| Alternative | What it covers | Source |
|-------------|----------------|--------|
| OrcaSlicer | native generator | https://example.invalid/orca |

## Gap
PrusaSlicer users have no native generator.

## Viability
Shows G-code parsing to hiring managers.

## Riskiest assumption
Sliced G-code exposes band heights — validation: read one file — result: pending: TSK-001

## Kill criteria
No recruiter opens the repo by 2026-12-01.
`;

const OVERVIEW = `# temp-tower

## Problem
## Success metric
## Riskiest assumption
Sliced G-code exposes band heights; TSK-001 tests it.
## Kill criteria
`;

const task = (id, dependsOn = "") =>
  `---\nid: ${id}\nstatus: pending\ndepends-on: [${dependsOn}]\n---\n\n**Outcome:** a user sees the bands\n`;

// The end state a successful kickstart run leaves behind.
function kickstarted(dir, { adr = ADR } = {}) {
  writeFiles(dir, {
    "docs/evaluation.md": EVALUATION,
    "docs/overview.md": OVERVIEW,
    "docs/adr/0001-process-gcode-as-a-stream.md": adr,
    "AGENTS.md": "# AGENTS.md\n",
    ".backlog/tasks/pending/TSK-001-test-the-riskiest-assumption.md": task("TSK-001"),
    ".backlog/tasks/pending/TSK-002-rewrite-one-band.md": task("TSK-002", "TSK-001"),
    ".backlog/tasks/pending/TSK-003-rewrite-every-band.md": task("TSK-003", "TSK-001,TSK-002"),
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

test("accepts capitalised verdicts and status and a typographic apostrophe", () => {
  withSandbox((dir) => {
    kickstarted(dir, { adr: ADR.replace("**Status:** accepted", "**Status:** Accepted") });
    const evaluation = EVALUATION.replace("feasible —", "Feasible —").replace("build with changes —", "Don’t build —");
    writeFileSync(join(dir, "docs", "evaluation.md"), evaluation);
    assert.deepEqual(checkSandbox(dir).failures, []);
  });
});

test("flags missing product sections and tasks without an Outcome line", () => {
  withSandbox((dir) => {
    kickstarted(dir);
    writeFileSync(join(dir, "docs", "evaluation.md"), EVALUATION.replace("## Viability", "## Notes"));
    writeFileSync(join(dir, "docs", "overview.md"), OVERVIEW.replace("## Kill criteria\n", ""));
    writeFiles(dir, { ".backlog/tasks/pending/TSK-001-test-the-riskiest-assumption.md": "---\nid: TSK-001\ndepends-on: []\n---\n" });
    const { failures } = checkSandbox(dir);
    assert.ok(failures.includes("docs/evaluation.md lacks sections: Viability"));
    assert.ok(failures.includes("docs/overview.md lacks sections: Kill criteria"));
    assert.ok(failures.includes("tasks without an Outcome line: TSK-001-test-the-riskiest-assumption.md"));
  });
});

test("accepts bold or backticked verdict words", () => {
  withSandbox((dir) => {
    kickstarted(dir);
    const evaluation = EVALUATION.replace("**Feasibility:** feasible", "**Feasibility:** **feasible**").replace(
      "**Build:** build with changes",
      "**Build:** `build with changes`",
    );
    writeFileSync(join(dir, "docs", "evaluation.md"), evaluation);
    assert.deepEqual(checkSandbox(dir).failures, []);
  });
});

test("flags every missing evaluation heading", () => {
  withSandbox((dir) => {
    kickstarted(dir);
    writeFileSync(join(dir, "docs", "evaluation.md"), EVALUATION.replace("## Market", "## Others").replace("## Kill criteria", "## Stop"));
    assert.ok(checkSandbox(dir).failures.includes("docs/evaluation.md lacks sections: Market, Kill criteria"));
  });
});

test("the deny-list respects word boundaries and covers short names", () => {
  const decision = (words) => ADR.replace("A pure function", `${words} A pure function`);
  const leaks = (dir, adr) => {
    writeFileSync(join(dir, "docs", "adr", "0001-process-gcode-as-a-stream.md"), adr);
    return checkSandbox(dir).failures.filter((f) => f.includes("Decision names"));
  };
  withSandbox((dir) => {
    kickstarted(dir);
    assert.deepEqual(leaks(dir, decision("We invite contributors.")), []);
    assert.ok(leaks(dir, decision("A Flask-based API."))[0]?.endsWith("flask"));
    assert.ok(leaks(dir, decision("Rendered with next.js."))[0]?.endsWith("next.js"));
    assert.ok(leaks(dir, decision("Stored in Postgres behind Docker."))[0]?.endsWith("postgres, docker"));
  });
});

test("flags a task 1 with dependencies and links to tasks that do not exist", () => {
  withSandbox((dir) => {
    kickstarted(dir);
    writeFiles(dir, {
      ".backlog/tasks/pending/TSK-001-test-the-riskiest-assumption.md": task("TSK-001", "TSK-002"),
      ".backlog/tasks/pending/TSK-003-rewrite-every-band.md": task("TSK-003", "TSK-001,TSK-009"),
    });
    const { failures } = checkSandbox(dir);
    assert.ok(failures.includes("TSK-001 is task 1 and must have no depends-on, has TSK-002"));
    assert.ok(failures.includes("TSK-003 depends on unknown tasks: TSK-009"));
  });
});

test("flags a commit made in the sandbox", () => {
  withSandbox((dir) => {
    kickstarted(dir);
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "chore: kickstart"]);
    assert.ok(checkSandbox(dir).failures.includes("a commit was made; kickstart must never commit"));
  });
});

test("flags a missing step 5 write-back of task 1's ID", () => {
  withSandbox((dir) => {
    kickstarted(dir);
    writeFileSync(join(dir, "docs", "evaluation.md"), EVALUATION.replace("pending: TSK-001", "pending: task 1"));
    writeFileSync(join(dir, "docs", "overview.md"), OVERVIEW.replace("TSK-001 tests it", "task 1 tests it"));
    const { failures } = checkSandbox(dir);
    assert.ok(failures.includes('docs/evaluation.md still says "pending: task 1"'));
    assert.ok(failures.includes("docs/evaluation.md does not name task 1 (TSK-001)"));
    assert.ok(failures.includes("docs/overview.md does not name task 1 (TSK-001)"));
  });
});

test("flags a later task not gated on task 1, unless the assumption held", () => {
  const ungated = (dir) =>
    writeFiles(dir, { ".backlog/tasks/pending/TSK-003-rewrite-every-band.md": task("TSK-003", "TSK-002") });
  withSandbox((dir) => {
    kickstarted(dir);
    ungated(dir);
    assert.ok(checkSandbox(dir).failures.includes("not gated on task 1 (TSK-001): TSK-003"));
  });
  withSandbox((dir) => {
    kickstarted(dir);
    ungated(dir);
    writeFileSync(join(dir, "docs", "evaluation.md"), EVALUATION.replace("result: pending: TSK-001", "result: held (TSK-001 kept as skeleton head)"));
    assert.ok(!checkSandbox(dir).failures.some((f) => f.startsWith("not gated")));
  });
});
