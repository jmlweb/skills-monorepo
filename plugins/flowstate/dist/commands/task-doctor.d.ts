import type { TaskStatus } from "../core/types.js";
import type { TaskBucket } from "../core/store.js";
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
