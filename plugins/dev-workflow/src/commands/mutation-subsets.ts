// Reads a Stryker mutation-testing-report JSON. Stryker's own coverage analysis
// (perTest) keeps the run cheap, so this command only reads what Stryker wrote.
export type StrykerTest = {
  readonly id: string;
  readonly name: string;
};

type StrykerMutant = {
  readonly status?: string;
  readonly killedBy?: readonly string[];
  readonly coveredBy?: readonly string[];
};

type StrykerReport = {
  readonly files?: Readonly<Record<string, { readonly mutants?: readonly StrykerMutant[] }>>;
  readonly testFiles?: Readonly<Record<string, { readonly tests?: readonly StrykerTest[] }>>;
};

export type MutationSubset = {
  readonly id: string;
  readonly name: string;
  readonly kills: number;
  readonly subsumedBy: readonly { readonly id: string; readonly name: string }[];
};

export type MutationReport = {
  readonly mutants: number;
  readonly tests: number;
  // Bail mode reports only the first killer, so every mutant looks singly killed.
  readonly bailSuspected: boolean;
  readonly zeroKill: readonly StrykerTest[];
  readonly subsets: readonly MutationSubset[];
};

const KILLED = "Killed";

export function analyseMutationReport(json: string): MutationReport {
  const report = JSON.parse(json) as StrykerReport;
  const mutants = Object.values(report.files ?? {}).flatMap((file) => file.mutants ?? []);
  const names = new Map<string, string>();
  for (const file of Object.values(report.testFiles ?? {})) {
    for (const test of file.tests ?? []) names.set(test.id, test.name);
  }

  const killed = mutants.filter((m) => m.status === KILLED);
  const bailSuspected =
    killed.length > 0 && killed.every((m) => (m.killedBy?.length ?? 0) <= 1);

  const kills = new Map<string, Set<number>>();
  const covers = new Map<string, Set<number>>();
  mutants.forEach((mutant, index) => {
    for (const id of mutant.killedBy ?? []) addTo(kills, id, index);
    for (const id of mutant.coveredBy ?? []) addTo(covers, id, index);
  });

  const testIds = [...names.keys()].sort();
  const label = (id: string): string => names.get(id) ?? id;
  const subsets = testIds.flatMap((id) => {
    const killCount = kills.get(id)?.size ?? 0;
    const subsumedBy = testIds
      .filter((other) => other !== id && isSubsumed(id, other, kills, covers))
      .map((other) => ({ id: other, name: label(other) }));
    return killCount > 0 && subsumedBy.length > 0
      ? [{ id, name: label(id), kills: killCount, subsumedBy }]
      : [];
  });

  return {
    mutants: mutants.length,
    tests: testIds.length,
    bailSuspected,
    zeroKill: testIds.filter((id) => !kills.has(id)).map((id) => ({ id, name: label(id) })),
    subsets,
  };
}

function addTo(map: Map<string, Set<number>>, key: string, value: number): void {
  const set = map.get(key) ?? new Set<number>();
  set.add(value);
  map.set(key, set);
}

// A test is subsumed when its kill set sits inside another test's kill set and
// it covers no mutant the other test misses. Ties keep the lower id, so two
// identical tests do not both get flagged.
function isSubsumed(
  id: string,
  other: string,
  kills: ReadonlyMap<string, ReadonlySet<number>>,
  covers: ReadonlyMap<string, ReadonlySet<number>>,
): boolean {
  const mine = kills.get(id);
  const theirs = kills.get(other);
  if (!mine || !theirs || mine.size === 0) return false;
  if (!isSubset(mine, theirs)) return false;
  const coveredByMe = covers.get(id) ?? new Set<number>();
  const coveredByThem = covers.get(other) ?? new Set<number>();
  if (!isSubset(coveredByMe, coveredByThem)) return false;
  return theirs.size > mine.size || other < id;
}

function isSubset(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  for (const item of a) if (!b.has(item)) return false;
  return true;
}
