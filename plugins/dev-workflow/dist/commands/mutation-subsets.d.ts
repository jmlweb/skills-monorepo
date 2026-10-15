export type StrykerTest = {
    readonly id: string;
    readonly name: string;
};
export type MutationSubset = {
    readonly id: string;
    readonly name: string;
    readonly kills: number;
    readonly subsumedBy: readonly {
        readonly id: string;
        readonly name: string;
    }[];
};
export type MutationReport = {
    readonly mutants: number;
    readonly tests: number;
    readonly bailSuspected: boolean;
    readonly zeroKill: readonly StrykerTest[];
    readonly subsets: readonly MutationSubset[];
};
export declare function analyseMutationReport(json: string): MutationReport;
