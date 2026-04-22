import type { TaskStatus } from "../core/types.js";
export interface TaskListItem {
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly priority: string;
    readonly tags: readonly string[];
    readonly created: string;
    readonly started: string | undefined;
    readonly completed: string | undefined;
    readonly blockedBy: string | undefined;
    readonly path: string;
}
export declare function taskList(cwd: string, status?: TaskStatus, limit?: number): Promise<TaskListItem[]>;
