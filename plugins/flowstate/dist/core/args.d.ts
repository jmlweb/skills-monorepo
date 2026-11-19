export interface ParsedArgs {
    readonly flags: Record<string, string>;
    readonly flagArrays: Record<string, string[]>;
    readonly positional: string[];
}
export declare function parseArgs(args: readonly string[], switches: ReadonlySet<string>): ParsedArgs;
export declare function rejectUnknownFlags(command: string, flags: Readonly<Record<string, string>>, accepted: ReadonlySet<string>): void;
