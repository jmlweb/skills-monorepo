import { readFileSync } from "node:fs";

// One unit is one test file run in isolation. `coverage` is the path to its
// coverage file: Istanbul JSON (coverage-final.json) or LCOV (lcov.info).
export type CoverageUnit = {
  readonly id: string;
  readonly durationMs: number;
  readonly coverage: string;
};

export type CoverageSet = {
  readonly id: string;
  readonly durationMs: number;
  readonly items: ReadonlySet<string>;
};

export type Subset = {
  readonly id: string;
  readonly durationMs: number;
  readonly coveredBy: readonly string[];
};

export type SubsetReport = {
  readonly units: number;
  readonly subsets: readonly Subset[];
  readonly skipped: readonly string[];
};

export function parseIstanbul(json: string): Set<string> {
  const items = new Set<string>();
  const files = JSON.parse(json) as Record<string, IstanbulFile>;
  for (const [file, data] of Object.entries(files)) {
    for (const [key, count] of Object.entries(data.s)) {
      if (count > 0) items.add(`${file}:stmt:${data.statementMap[key]?.start.line}:${key}`);
    }
    for (const [key, counts] of Object.entries(data.b)) {
      counts.forEach((count, index) => {
        if (count > 0) items.add(`${file}:branch:${key}:${index}`);
      });
    }
  }
  return items;
}

type IstanbulFile = {
  readonly s: Record<string, number>;
  readonly b: Record<string, readonly number[]>;
  readonly statementMap: Record<string, { readonly start: { readonly line: number } }>;
};

// LCOV has no statement ids, so covered lines and branches stand in for them.
export function parseLcov(text: string): Set<string> {
  const items = new Set<string>();
  let file = "";
  for (const raw of text.split("\n")) {
    if (raw.startsWith("SF:")) file = raw.slice(3);
    else if (raw.startsWith("DA:")) {
      const [line, hits] = raw.slice(3).split(",");
      if (Number(hits) > 0) items.add(`${file}:line:${line}`);
    } else if (raw.startsWith("BRDA:")) {
      const [line, block, branch, taken] = raw.slice(5).split(",");
      if (taken !== undefined && taken !== "-" && Number(taken) > 0) {
        items.add(`${file}:branch:${line}:${block}:${branch}`);
      }
    }
  }
  return items;
}

export function parseCoverage(content: string): Set<string> {
  return content.trimStart().startsWith("{") ? parseIstanbul(content) : parseLcov(content);
}

// A unit is redundant on coverage alone only as a subset of another unit. The
// caller still has to confirm the assertions are subsumed before deleting it.
export function findCoverageSubsets(sets: readonly CoverageSet[]): SubsetReport {
  const subsets: Subset[] = [];
  const skipped: string[] = [];
  for (const unit of sets) {
    if (unit.items.size === 0) {
      skipped.push(unit.id);
      continue;
    }
    const coveredBy = sets
      .filter((other) => other.id !== unit.id && isSubset(unit.items, other.items))
      .filter((other) => other.items.size > unit.items.size || other.id < unit.id)
      .map((other) => other.id);
    if (coveredBy.length > 0) {
      subsets.push({ id: unit.id, durationMs: unit.durationMs, coveredBy });
    }
  }
  return {
    units: sets.length,
    subsets: subsets.sort((a, b) => b.durationMs - a.durationMs),
    skipped,
  };
}

function isSubset(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

export function loadCoverageSets(units: readonly CoverageUnit[]): CoverageSet[] {
  return units.map((unit) => ({
    id: unit.id,
    durationMs: unit.durationMs,
    items: parseCoverage(readFileSync(unit.coverage, "utf-8")),
  }));
}
