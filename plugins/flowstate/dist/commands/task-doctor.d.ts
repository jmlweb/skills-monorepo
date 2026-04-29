import type { TaskStatus } from "../core/types.js";
export interface TaskDoctorFix {
    readonly id: string;
    readonly path: string;
    readonly folder: TaskStatus;
    readonly statusBefore: string;
    readonly statusAfter: TaskStatus;
}
export interface TaskDoctorResult {
    readonly scanned: number;
    readonly fixed: readonly TaskDoctorFix[];
}
export declare function taskDoctor(cwd: string, options?: {
    readonly dryRun?: boolean;
}): Promise<TaskDoctorResult>;
