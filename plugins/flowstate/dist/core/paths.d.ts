import type { EntityType, TaskStatus } from "./types.js";
export declare const BACKLOG_DIR_ENV = "FLOWSTATE_BACKLOG_DIR";
export type BacklogSource = "env" | "walk-up";
export interface ResolvedBacklog {
    readonly dir: string;
    readonly source: BacklogSource;
}
type Env = Readonly<Record<string, string | undefined>>;
export declare function findProjectRoot(start: string): string;
export declare function resolveBacklog(start: string, env?: Env): ResolvedBacklog;
export declare function findBacklogRoot(start: string, env?: Env): string;
export declare function taskDir(root: string, status: TaskStatus | "all"): string;
export declare function ideaDir(root: string, status: "pending" | "complete"): string;
export declare function reportDir(root: string, status: "pending" | "complete"): string;
export declare function learningsDir(root: string): string;
export declare function taskIndexPath(root: string): string;
export declare function learningsIndexPath(root: string): string;
export declare const ENTITY_DIRS: Record<EntityType, readonly {
    readonly dir: string;
    readonly status: string;
}[]>;
export declare function privateBacklogDir(start: string): string;
export interface SetupTargetInput {
    readonly dir?: string;
    readonly isPrivate?: boolean;
}
export interface SetupTarget {
    readonly dir: string;
    readonly isCustom: boolean;
}
export declare function resolveSetupTarget(start: string, input: SetupTargetInput, env?: Env): SetupTarget;
export declare function settingsSnippet(dir: string): string;
export {};
