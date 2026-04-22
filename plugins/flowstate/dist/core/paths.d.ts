import type { EntityType, TaskStatus } from "./types.js";
export declare function findBacklogRoot(start: string): string;
export declare function backlogRoot(cwd: string): string;
export declare function taskDir(cwd: string, status: TaskStatus | "all"): string;
export declare function ideaDir(cwd: string, status: "pending" | "complete"): string;
export declare function reportDir(cwd: string, status: "pending" | "complete"): string;
export declare function learningsDir(cwd: string): string;
export declare function taskIndexPath(cwd: string): string;
export declare function learningsIndexPath(cwd: string): string;
export declare const TASK_DIRS: readonly TaskStatus[];
export declare const ENTITY_DIRS: Record<EntityType, readonly {
    readonly dir: string;
    readonly status: string;
}[]>;
