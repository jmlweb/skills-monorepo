import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  maskLiterals,
  readSourceFiles,
  scanTests,
  STALE_SKIP_MS,
  type SourceFile,
} from "./test-static-scan.js";

const NOW = Date.UTC(2026, 9, 15);
const noHistory = (): number | null => null;

const scan = (files: SourceFile[], lastChangedAt = noHistory) =>
  scanTests(files, { now: NOW, lastChangedAt });

describe("scanTests", () => {
  it("flags assertion-free tests but not tests that call a helper assert", () => {
    const report = scan([
      {
        path: "a.test.ts",
        source: `it("empty", () => { doWork(); });\nit("helper", () => { assertValid(x); });`,
      },
    ]);
    expect(report.assertionFree.map((t) => t.name)).toEqual(["empty"]);
  });

  it("treats snapshot assertions as assertions", () => {
    const report = scan([
      { path: "s.test.ts", source: `it("snap", () => { expect(out).toMatchSnapshot(); });` },
    ]);
    expect(report.assertionFree).toHaveLength(0);
  });

  it("flags a self-comparing trivial assertion", () => {
    const report = scan([
      { path: "t.test.ts", source: `it("tautology", () => { expect(true).toBe(true); });` },
    ]);
    expect(report.trivialAssertion.map((t) => t.name)).toEqual(["tautology"]);
  });

  it("flags a self-comparing node:assert call as trivial", () => {
    const report = scan([
      { path: "n.test.mjs", source: `test("sanity", () => { assert.equal(true, true); });` },
    ]);
    expect(report.trivialAssertion.map((t) => t.name)).toEqual(["sanity"]);
  });

  it("flags wait helpers called with a literal duration, not with a promise", () => {
    const report = scan([
      { path: "d.test.mjs", source: `test("d", async () => { await delay(300); assert.ok(1); });` },
      { path: "w.test.mjs", source: `test("w", async () => { await wait(promise); assert.ok(1); });` },
    ]);
    expect(report.sleepTests.map((t) => t.name)).toEqual(["d"]);
  });

  it("never groups parameterisable tests across files", () => {
    const report = scan([
      { path: "a.test.ts", source: `it("a", () => { expect(add(1, 2)).toBe(3); });` },
      { path: "b.test.ts", source: `it("b", () => { expect(add(4, 5)).toBe(9); });` },
    ]);
    expect(report.parameterisable).toHaveLength(0);
  });

  it("groups exact duplicates across files", () => {
    const body = `{ const r = parse("a"); expect(r.ok).toBe(true); }`;
    const report = scan([
      { path: "one.test.ts", source: `it("first", () => ${body});` },
      { path: "two.test.ts", source: `it("second", () => ${body});` },
    ]);
    expect(report.duplicates).toHaveLength(1);
    expect(report.duplicates[0]?.tests.map((t) => t.file)).toEqual(["one.test.ts", "two.test.ts"]);
  });

  it("groups tests that differ only in literal values as parameterisable", () => {
    const report = scan([
      {
        path: "p.test.ts",
        source: [
          `it("a", () => { expect(add(1, 2)).toBe(3); });`,
          `it("b", () => { expect(add(4, 5)).toBe(9); });`,
        ].join("\n"),
      },
    ]);
    expect(report.duplicates).toHaveLength(0);
    expect(report.parameterisable).toHaveLength(1);
  });

  it("flags real sleeps but not tests that use fake timers", () => {
    const report = scan([
      { path: "sleep.test.ts", source: `it("waits", async () => { await sleep(500); expect(1).toBe(1); });` },
      {
        path: "fake.test.ts",
        source: `beforeEach(() => vi.useFakeTimers());\nit("waits", () => { setTimeout(fn, 500); expect(1).toBe(1); });`,
      },
    ]);
    expect(report.sleepTests.map((t) => t.file)).toEqual(["sleep.test.ts"]);
  });

  it("marks skipped tests stale only after the threshold", () => {
    const recent = NOW - STALE_SKIP_MS + 1000;
    const old = NOW - STALE_SKIP_MS - 1000;
    const fresh = scan([{ path: "r.test.ts", source: `it.skip("x", () => {});` }], () => recent);
    const stale = scan([{ path: "o.test.ts", source: `it.skip("y", () => {});` }], () => old);
    expect(fresh.skipped[0]?.staleSkip).toBe(false);
    expect(stale.skipped[0]?.staleSkip).toBe(true);
  });

  it("keeps skipped tests out of duplicate groups", () => {
    const body = `{ expect(1).toBe(1); }`;
    const report = scan([
      { path: "a.test.ts", source: `it.skip("a", () => ${body});\nit.skip("b", () => ${body});` },
    ]);
    expect(report.duplicates).toHaveLength(0);
  });
});

describe("maskLiterals", () => {
  it("masks strings and numbers but keeps structure", () => {
    expect(maskLiterals(`expect(f("abc", 12)).toBe(7)`)).toBe(`expect(f('S', 0)).toBe(0)`);
  });
});

describe("readSourceFiles", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "scan-"));
    mkdirSync(join(root, "src"), { recursive: true });
    mkdirSync(join(root, "node_modules", "dep"), { recursive: true });
    writeFileSync(join(root, "src", "a.test.ts"), `it("a", () => { expect(1).toBe(1); });`);
    writeFileSync(join(root, "src", "a.ts"), "export const a = 1;");
    writeFileSync(join(root, "node_modules", "dep", "x.test.ts"), "");
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("reads only test files outside vendored folders", () => {
    expect(readSourceFiles(root).map((f) => f.path)).toEqual(["src/a.test.ts"]);
  });

  it("fails when the root does not exist", () => {
    expect(() => readSourceFiles(join(root, "missing"))).toThrow();
  });
});
