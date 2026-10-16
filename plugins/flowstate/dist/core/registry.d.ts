type Env = Readonly<Record<string, string | undefined>>;
export type LearningScope = "local" | "all";
export interface LearningSource {
    readonly root: string;
    readonly label: string;
}
export interface SkippedSource {
    readonly path: string;
    readonly reason: string;
}
export interface SharedBacklogs {
    readonly sources: readonly LearningSource[];
    readonly skipped: readonly SkippedSource[];
}
export declare function isSharedEnabled(env?: Env): boolean;
export declare function registryPath(env?: Env): string;
export declare function canonicalBacklogPath(dir: string): string;
export declare function readRegistry(env?: Env): Promise<string[]>;
export declare function registerBacklog(dir: string, env?: Env): Promise<void>;
export declare function resolveSharedBacklogs(root: string, env?: Env): Promise<SharedBacklogs>;
export declare function learningSources(root: string, scope: LearningScope, shared: readonly LearningSource[]): LearningSource[];
export {};
