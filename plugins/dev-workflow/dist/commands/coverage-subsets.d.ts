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
export declare function parseIstanbul(json: string): Set<string>;
export declare function parseLcov(text: string): Set<string>;
export declare function parseCoverage(content: string): Set<string>;
export declare function findCoverageSubsets(sets: readonly CoverageSet[]): SubsetReport;
export declare function loadCoverageSets(units: readonly CoverageUnit[]): CoverageSet[];
