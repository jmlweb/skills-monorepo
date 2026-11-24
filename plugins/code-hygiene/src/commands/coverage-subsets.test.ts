import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findCoverageSubsets,
  loadCoverageSets,
  parseCoverage,
  parseIstanbul,
  parseLcov,
} from "./coverage-subsets.js";

const istanbul = (hits: Record<string, number>, branches: Record<string, number[]> = {}) =>
  JSON.stringify({
    "/repo/src/a.ts": {
      path: "/repo/src/a.ts",
      statementMap: Object.fromEntries(
        Object.keys(hits).map((k) => [k, { start: { line: Number(k) }, end: { line: Number(k) } }]),
      ),
      s: hits,
      branchMap: {},
      b: branches,
      fnMap: {},
      f: {},
    },
  });

describe("parseIstanbul", () => {
  it("keeps only statements and branches with a hit", () => {
    const items = parseIstanbul(istanbul({ "1": 2, "2": 0 }, { "1": [1, 0] }));
    expect([...items].sort()).toEqual([
      "/repo/src/a.ts:branch:1:0",
      "/repo/src/a.ts:stmt:1:1",
    ]);
  });
});

describe("parseLcov", () => {
  it("reads covered lines and taken branches", () => {
    const items = parseLcov(
      ["SF:src/a.js", "DA:3,1", "DA:4,0", "BRDA:3,0,0,1", "BRDA:3,0,1,-", "end_of_record"].join("\n"),
    );
    expect([...items].sort()).toEqual(["src/a.js:branch:3:0:0", "src/a.js:line:3"]);
  });
});

describe("parseCoverage", () => {
  it("chooses the parser from the content", () => {
    expect(parseCoverage(istanbul({ "1": 1 })).size).toBe(1);
    expect(parseCoverage("SF:x.js\nDA:1,1\n").size).toBe(1);
  });
});

describe("findCoverageSubsets", () => {
  const set = (id: string, durationMs: number, items: string[]) => ({
    id,
    durationMs,
    items: new Set(items),
  });

  it("reports a unit whose coverage sits inside another's, ranked by duration", () => {
    const report = findCoverageSubsets([
      set("small.test.ts", 50, ["x"]),
      set("big.test.ts", 900, ["x", "y"]),
      set("slow.test.ts", 400, ["z"]),
    ]);
    expect(report.subsets).toEqual([
      { id: "small.test.ts", durationMs: 50, coveredBy: ["big.test.ts"] },
    ]);
  });

  it("keeps one of two units with identical coverage", () => {
    const report = findCoverageSubsets([set("a.test.ts", 1, ["x"]), set("b.test.ts", 1, ["x"])]);
    expect(report.subsets.map((s) => s.id)).toEqual(["b.test.ts"]);
  });

  it("skips units that cover nothing instead of calling them redundant", () => {
    const report = findCoverageSubsets([set("empty.test.ts", 1, []), set("real.test.ts", 1, ["x"])]);
    expect(report.skipped).toEqual(["empty.test.ts"]);
    expect(report.subsets).toEqual([]);
  });
});

describe("loadCoverageSets", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "cov-"));
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("reads each unit's coverage file from disk", () => {
    const path = join(root, "coverage-final.json");
    writeFileSync(path, istanbul({ "1": 1 }));
    const [unit] = loadCoverageSets([{ id: "a.test.ts", durationMs: 10, coverage: path }]);
    expect(unit?.items.size).toBe(1);
  });

  it("fails when a coverage file is missing", () => {
    expect(() =>
      loadCoverageSets([{ id: "a.test.ts", durationMs: 10, coverage: join(root, "nope.json") }]),
    ).toThrow();
  });
});
