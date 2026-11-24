export type TestBlock = {
    readonly name: string;
    readonly line: number;
    readonly start: number;
    readonly end: number;
    readonly body: string | null;
    readonly skipped: boolean;
    readonly todo: boolean;
    readonly parameterised: boolean;
};
export declare function findClosing(source: string, openIndex: number, open: string, close: string): number | null;
export declare function extractTestBlocks(source: string): TestBlock[];
