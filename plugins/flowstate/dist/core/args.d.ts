export interface ParsedArgs {
    readonly flags: Record<string, string>;
    readonly flagArrays: Record<string, string[]>;
    readonly positional: string[];
}
export declare function parseArgs(args: readonly string[], switches: ReadonlySet<string>): ParsedArgs;
