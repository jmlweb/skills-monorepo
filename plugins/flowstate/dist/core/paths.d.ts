import type { EntityType, TaskStatus } from "./types.js";
export declare function findBacklogRoot(start: string): string;
export declare function backlogRoot(root: string): string;
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
