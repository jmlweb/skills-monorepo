import type { Priority } from "../core/types.js";
export interface TaskCreateInput {
    readonly title: string;
    readonly priority: Priority;
    readonly tags: readonly string[];
    readonly description: string;
    readonly criteria: readonly string[];
    readonly source: string;
    readonly dependsOn: readonly string[];
}
export interface TaskCreateResult {
    readonly id: string;
    readonly path: string;
}
export declare function taskCreate(cwd: string, input: TaskCreateInput): Promise<TaskCreateResult>;
