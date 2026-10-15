export type CommandResult = {
    readonly exitCode: number | null;
    readonly timedOut: boolean;
    readonly durationMs: number;
    readonly stdout: string;
    readonly stderr: string;
};
export declare function runCommand(cwd: string, argv: readonly string[], timeoutMs: number): CommandResult;
