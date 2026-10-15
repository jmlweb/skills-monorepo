import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getLastCommitTime } from "../core/git.js";
import { extractTestBlocks, type TestBlock } from "../core/test-blocks.js";
import { walkFiles } from "../core/walk.js";

export const STALE_SKIP_MS = 182 * 24 * 60 * 60 * 1000;

const TEST_FILE = /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/;

// Helper calls count as assertions by name. A test that only calls code and
// checks that it does not throw still matches as assertion-free, so the skill
// reads the body before it deletes anything.
const ASSERTION = /\bexpect\s*[.(]|\bassert\w*\s*[.(]|\b(?:verify|ensure|check|validate)\w*\s*\(|toMatch\w*Snapshot\s*\(/;
const TRIVIAL =
  /\bexpect\(\s*([^()]+?)\s*\)\.to(?:Be|Equal|StrictEqual)\(\s*\1\s*\)|\bassert\.(?:equal|strictEqual|deepEqual|deepStrictEqual)\(\s*([^,()]+?)\s*,\s*\2\s*\)/;
// Wait helpers are matched only with a literal duration, so an awaited
// `wait(promise)` is not mistaken for a real sleep.
const SLEEP = /\bsetTimeout\s*\(|\b(?:sleep|delay|wait)\s*\(\s*\d/;
const FAKE_TIMERS = /useFakeTimers|mock\.timers/;

export type SourceFile = {
  readonly path: string;
  readonly source: string;
};

export type ScannedTest = {
  readonly file: string;
  readonly line: number;
  readonly name: string;
  readonly skipped: boolean;
  readonly todo: boolean;
  readonly parameterised: boolean;
  readonly assertionFree: boolean;
  readonly trivialAssertion: boolean;
  readonly sleepCall: boolean;
  readonly lastChangedAt: number | null;
  readonly staleSkip: boolean;
  readonly exactKey: string | null;
  readonly maskedKey: string | null;
};

export type TestGroup = {
  readonly key: string;
  readonly tests: readonly ScannedTest[];
};

export type ScanReport = {
  readonly testFiles: number;
  readonly tests: number;
  readonly assertionFree: readonly ScannedTest[];
  readonly trivialAssertion: readonly ScannedTest[];
  readonly skipped: readonly ScannedTest[];
  readonly duplicates: readonly TestGroup[];
  readonly parameterisable: readonly TestGroup[];
  readonly sleepTests: readonly ScannedTest[];
};

export type ScanOptions = {
  readonly now: number;
  readonly lastChangedAt: (file: string) => number | null;
};

// Masks literal values so tests that differ only in data share a key. Structure
// stays in the key, so tests that differ in shape never fold together.
export function maskLiterals(body: string): string {
  return body
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, "'S'")
    .replace(/\b\d+(?:\.\d+)?\b/g, "0");
}

function normalise(body: string): string {
  return body.replace(/\s+/g, " ").trim();
}

function scanBlock(
  file: string,
  block: TestBlock,
  source: string,
  options: ScanOptions,
): ScannedTest {
  const body = block.body;
  const lastChangedAt = block.skipped || block.todo ? options.lastChangedAt(file) : null;
  const staleSkip =
    lastChangedAt !== null && options.now - lastChangedAt >= STALE_SKIP_MS;
  return {
    file,
    line: block.line,
    name: block.name,
    skipped: block.skipped,
    todo: block.todo,
    parameterised: block.parameterised,
    assertionFree: body !== null && !ASSERTION.test(body),
    trivialAssertion: body !== null && TRIVIAL.test(body),
    sleepCall: body !== null && SLEEP.test(body) && !FAKE_TIMERS.test(source),
    lastChangedAt,
    staleSkip,
    exactKey: body === null ? null : normalise(body),
    maskedKey: body === null ? null : maskLiterals(normalise(body)),
  };
}

function groupBy(
  tests: readonly ScannedTest[],
  key: (test: ScannedTest) => string | null,
  keep: (group: readonly ScannedTest[]) => boolean,
): TestGroup[] {
  const buckets = new Map<string, ScannedTest[]>();
  for (const test of tests) {
    const k = key(test);
    if (k === null || k === "") continue;
    buckets.set(k, [...(buckets.get(k) ?? []), test]);
  }
  return [...buckets.entries()]
    .filter(([, group]) => keep(group))
    .map(([k, group]) => ({ key: k, tests: group }));
}

export function scanTests(
  files: readonly SourceFile[],
  options: ScanOptions,
): ScanReport {
  const tests = files.flatMap((file) =>
    extractTestBlocks(file.source).map((block) =>
      scanBlock(file.path, block, file.source, options),
    ),
  );
  const active = tests.filter((t) => !t.skipped && !t.todo && !t.parameterised);
  return {
    testFiles: files.length,
    tests: tests.length,
    assertionFree: tests.filter((t) => t.assertionFree && !t.skipped),
    trivialAssertion: tests.filter((t) => t.trivialAssertion),
    skipped: tests.filter((t) => t.skipped || t.todo),
    duplicates: groupBy(active, (t) => t.exactKey, (g) => g.length > 1),
    // A parameterised table lives in one file, so folding never crosses files.
    parameterisable: groupBy(
      active,
      (t) => (t.maskedKey === null ? null : `${t.file}\n${t.maskedKey}`),
      (g) => g.length > 1 && new Set(g.map((t) => t.exactKey)).size > 1,
    ),
    sleepTests: tests.filter((t) => t.sleepCall),
  };
}

export function readSourceFiles(root: string): SourceFile[] {
  return walkFiles(root, (rel) => TEST_FILE.test(rel)).map((path) => ({
    path,
    source: readFileSync(join(root, path), "utf-8"),
  }));
}

export function lastChangedAtFromGit(root: string): (file: string) => number | null {
  return (file) => getLastCommitTime(root, file);
}
