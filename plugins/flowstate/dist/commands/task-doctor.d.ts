import type { TaskStatus } from "../core/types.js";
import type { TaskBucket } from "../core/store.js";
import type { GithubStore } from "../core/github-store.js";
export interface TaskDoctorLabelFix {
    readonly id: string;
    readonly path: string;
    readonly added: string;
    readonly removed: string;
}
export interface TaskDoctorInvalidIssue {
    readonly id: string;
    readonly path: string;
    readonly reason: string;
}
export interface TaskDoctorGithubResult {
    readonly scanned: number;
    readonly fixed: readonly TaskDoctorLabelFix[];
    readonly invalid: readonly TaskDoctorInvalidIssue[];
}
export declare function taskDoctorGithub(store: GithubStore, options?: {
    readonly dryRun?: boolean;
}): Promise<TaskDoctorGithubResult>;
export interface TaskDoctorFix {
    readonly id: string;
    readonly path: string;
    readonly folder: TaskBucket;
    readonly statusBefore: string;
    readonly statusAfter: TaskStatus;
}
export interface TaskDoctorResult {
    readonly scanned: number;
    readonly fixed: readonly TaskDoctorFix[];
}
export declare function taskDoctor(root: string, options?: {
    readonly dryRun?: boolean;
}): Promise<TaskDoctorResult>;
