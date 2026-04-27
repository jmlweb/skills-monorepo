import type { LearningStatus } from "../core/types.js";
export type LearningStatusFilter = LearningStatus | "all";
export interface LearningListInput {
    readonly all?: boolean;
    readonly status?: LearningStatusFilter;
}
export interface LearningListResult {
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly tags: readonly string[];
    readonly task: string;
    readonly created: string;
    readonly body: string;
}
export declare function learningList(cwd: string, input?: LearningListInput): Promise<LearningListResult[]>;
