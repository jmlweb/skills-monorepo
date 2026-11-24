const KILLED = "Killed";
export function analyseMutationReport(json) {
    const report = JSON.parse(json);
    const mutants = Object.values(report.files ?? {}).flatMap((file) => file.mutants ?? []);
    const names = new Map();
    for (const file of Object.values(report.testFiles ?? {})) {
        for (const test of file.tests ?? [])
            names.set(test.id, test.name);
    }
    const killed = mutants.filter((m) => m.status === KILLED);
    const bailSuspected = killed.length > 0 && killed.every((m) => (m.killedBy?.length ?? 0) <= 1);
    const kills = new Map();
    const covers = new Map();
    mutants.forEach((mutant, index) => {
        for (const id of mutant.killedBy ?? [])
            addTo(kills, id, index);
        for (const id of mutant.coveredBy ?? [])
            addTo(covers, id, index);
    });
    const testIds = [...names.keys()].sort();
    const label = (id) => names.get(id) ?? id;
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
function addTo(map, key, value) {
    const set = map.get(key) ?? new Set();
    set.add(value);
    map.set(key, set);
}
// A test is subsumed when its kill set sits inside another test's kill set and
// it covers no mutant the other test misses. Ties keep the lower id, so two
// identical tests do not both get flagged.
function isSubsumed(id, other, kills, covers) {
    const mine = kills.get(id);
    const theirs = kills.get(other);
    if (!mine || !theirs || mine.size === 0)
        return false;
    if (!isSubset(mine, theirs))
        return false;
    const coveredByMe = covers.get(id) ?? new Set();
    const coveredByThem = covers.get(other) ?? new Set();
    if (!isSubset(coveredByMe, coveredByThem))
        return false;
    return theirs.size > mine.size || other < id;
}
function isSubset(a, b) {
    for (const item of a)
        if (!b.has(item))
            return false;
    return true;
}
