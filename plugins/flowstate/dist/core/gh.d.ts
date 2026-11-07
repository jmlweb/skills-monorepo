export interface GhRunOptions {
    readonly input?: string;
}
export type GhRunner = (args: readonly string[], options?: GhRunOptions) => Promise<string>;
export interface GhRunnerConfig {
    readonly cwd?: string;
    readonly env?: NodeJS.ProcessEnv;
    readonly timeoutMs?: number;
}
export declare function classifyGhFailure(args: readonly string[], stderr: string, repo?: string): Error;
export declare function createGhRunner(config?: GhRunnerConfig): GhRunner;
export declare function ghJson<T>(gh: GhRunner, args: readonly string[], options?: GhRunOptions): Promise<T>;
