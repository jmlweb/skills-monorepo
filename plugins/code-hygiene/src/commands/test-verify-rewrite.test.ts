import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Claim, judge, lostCoverage, median, timeGainHolds, verifyRewrite, type RunSummary } from "./test-verify-rewrite.js";

// The "test command" is node running the file itself, so each fixture file is a
// tiny program that prints a runner-style summary and exits with its verdict.
const PASSING_RUNNER = `console.log("Tests  2 passed (2)");`;
const ORIGINAL = `// expect(a).toBe(1)\n// expect(b).toBe(2)\n${PASSING_RUNNER}\n`;
const REWRITE_KEEPS = `// expect(a).toBe(1)\n// expect(b).toBe(2)\n${PASSING_RUNNER}\n`;
const REWRITE_DROPS_ASSERTION = `// expect(a).toBe(1)\n${PASSING_RUNNER}\n`;
const REWRITE_FAILS = `console.log("Tests  1 failed | 1 passed (2)"); process.exit(1);\n`;
// With a {dir} argument the fixture acts as a coverage run and writes LCOV:
// src/a.js lines hit as given, plus lines of the test file itself.
const coverageFixture = (hitsLine2: number, testLines: number) => [
  `import { writeFileSync } from "node:fs";`,
  `const dir = process.argv[2];`,
  `if (dir) writeFileSync(dir + "/lcov.info", "SF:src/a.js\\nDA:1,1\\nDA:2,${hitsLine2}\\nend_of_record\\nSF:a.test.mjs\\nDA:${testLines},1\\nend_of_record\\n");`,
  `// expect(a).toBe(1)`,
  `// expect(b).toBe(2)`,
  PASSING_RUNNER,
].join("\n");
const COVERAGE_COMMAND = ["node", "{file}", "{dir}"];

const REWRITE_SHUFFLE_FAILS = `if (process.argv.includes("--sequence.shuffle")) process.exit(1);\n${PASSING_RUNNER}\n`;

const summary = (overrides: Partial<RunSummary>): RunSummary => ({
  passed: true,
  cases: 2,
  medianMs: 100,
  spreadMs: 10,
  ...overrides,
});

describe("verifyRewrite", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "verify-"));
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const run = (rewrite: string, extra: Partial<Parameters<typeof verifyRewrite>[0]> = {}) => {
    writeFileSync(join(root, "a.test.mjs"), ORIGINAL);
    writeFileSync(join(root, "rewrite.mjs"), rewrite);
    return verifyRewrite({
      cwd: root,
      file: "a.test.mjs",
      rewrittenPath: join(root, "rewrite.mjs"),
      command: ["node", "{file}"],
      shuffleArgs: [],
      runs: 2,
      timeoutMs: 10_000,
      claim: Claim.LINES,
      coverageCommand: null,
      ...extra,
    });
  };

  it("passes a rewrite that keeps cases and assertions, and restores the original", () => {
    const report = run(REWRITE_KEEPS);
    expect(report.verdict).toBe("pass");
    expect(report.reasons).toEqual([]);
    expect(readFileSync(join(root, "a.test.mjs"), "utf-8")).toBe(ORIGINAL);
  });

  it("fails and restores the original when the rewrite fails a run", () => {
    const report = run(REWRITE_FAILS);
    expect(report.verdict).toBe("fail");
    expect(report.reasons).toContain("rewritten file fails in at least one run");
    expect(readFileSync(join(root, "a.test.mjs"), "utf-8")).toBe(ORIGINAL);
  });

  it("fails when assertion calls are lost", () => {
    const report = run(REWRITE_DROPS_ASSERTION);
    expect(report.assertions).toEqual({ before: 2, after: 1 });
    expect(report.reasons.some((r) => r.startsWith("assertion calls fell"))).toBe(true);
  });

  it("fails when the rewrite passes normally but fails shuffled", () => {
    const report = run(REWRITE_SHUFFLE_FAILS, { shuffleArgs: ["--sequence.shuffle"] });
    expect(report.shuffled?.passed).toBe(false);
    expect(report.reasons).toContain("rewritten file fails when test order is shuffled");
  });

  it("fails when the rewrite stops covering code under test", () => {
    writeFileSync(join(root, "a.test.mjs"), coverageFixture(1, 5));
    writeFileSync(join(root, "rewrite.mjs"), coverageFixture(0, 5));
    const report = verifyRewrite({
      cwd: root, file: "a.test.mjs", rewrittenPath: join(root, "rewrite.mjs"),
      command: ["node", "{file}"], shuffleArgs: [], runs: 1, timeoutMs: 10_000,
      claim: Claim.LINES, coverageCommand: COVERAGE_COMMAND,
    });
    expect(report.coverage?.lost).toEqual(["src/a.js:line:2"]);
    expect(report.verdict).toBe("fail");
    expect(readFileSync(join(root, "a.test.mjs"), "utf-8")).toBe(coverageFixture(1, 5));
  });

  it("ignores coverage changes inside the rewritten test file itself", () => {
    writeFileSync(join(root, "a.test.mjs"), coverageFixture(1, 5));
    writeFileSync(join(root, "rewrite.mjs"), coverageFixture(1, 3));
    const report = verifyRewrite({
      cwd: root, file: "a.test.mjs", rewrittenPath: join(root, "rewrite.mjs"),
      command: ["node", "{file}"], shuffleArgs: [], runs: 1, timeoutMs: 10_000,
      claim: Claim.LINES, coverageCommand: COVERAGE_COMMAND,
    });
    expect(report.coverage?.lost).toEqual([]);
    expect(report.verdict).toBe("pass");
  });

  it("throws and restores the original when the coverage command writes nothing", () => {
    writeFileSync(join(root, "a.test.mjs"), ORIGINAL);
    writeFileSync(join(root, "rewrite.mjs"), REWRITE_KEEPS);
    expect(() =>
      verifyRewrite({
        cwd: root, file: "a.test.mjs", rewrittenPath: join(root, "rewrite.mjs"),
        command: ["node", "{file}"], shuffleArgs: [], runs: 1, timeoutMs: 10_000,
        claim: Claim.LINES, coverageCommand: COVERAGE_COMMAND,
      }),
    ).toThrow("wrote no");
    expect(readFileSync(join(root, "a.test.mjs"), "utf-8")).toBe(ORIGINAL);
  });

  it("fails loudly when the runner summary cannot be parsed", () => {
    const report = run(`console.log("no summary here");\n`);
    expect(report.verdict).toBe("fail");
    expect(report.reasons.some((r) => r.includes("cannot prove no test case was lost"))).toBe(true);
  });
});

describe("judge", () => {
  const base = { shuffled: null, assertions: { before: 1, after: 1 } };

  it("rejects fewer passed cases", () => {
    const reasons = judge({ ...base, baseline: summary({ cases: 3 }), rewrite: summary({ cases: 2 }), claim: Claim.LINES });
    expect(reasons).toContain("passed cases fell from 3 to 2");
  });

  it("accepts fewer static assertion calls for a fold when cases held", () => {
    const reasons = judge({
      shuffled: null,
      assertions: { before: 3, after: 1 },
      baseline: summary({ cases: 3 }),
      rewrite: summary({ cases: 3 }),
      claim: Claim.FOLD,
    });
    expect(reasons).toEqual([]);
  });

  it("rejects a fold whose cases fell, even with the assertion check relaxed", () => {
    const reasons = judge({
      shuffled: null,
      assertions: { before: 3, after: 1 },
      baseline: summary({ cases: 3 }),
      rewrite: summary({ cases: 2 }),
      claim: Claim.FOLD,
    });
    expect(reasons).toContain("passed cases fell from 3 to 2");
    expect(reasons).toContain("assertion calls fell from 3 to 1");
  });

  it("requires time gain to exceed the spread when claimed", () => {
    const reasons = judge({
      ...base,
      baseline: summary({ medianMs: 100, spreadMs: 30 }),
      rewrite: summary({ medianMs: 90 }),
      claim: Claim.TIME,
    });
    expect(reasons).toContain("time gain is within the spread between runs");
  });

  it("accepts a time gain larger than the spread", () => {
    expect(timeGainHolds(summary({ medianMs: 100, spreadMs: 5 }), summary({ medianMs: 50 }))).toBe(true);
  });
});

describe("lostCoverage", () => {
  it("returns items covered before but not after, outside the test file", () => {
    const before = new Set(["/r/src/a.ts:stmt:1:0", "/r/src/a.ts:stmt:2:1", "/r/test/a.test.ts:stmt:3:0"]);
    const after = new Set(["/r/src/a.ts:stmt:1:0"]);
    expect(lostCoverage(before, after, "test/a.test.ts")).toEqual(["/r/src/a.ts:stmt:2:1"]);
  });
});

describe("median", () => {
  it("averages the two middle values of an even count", () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([5, 1, 3])).toBe(3);
  });
});
