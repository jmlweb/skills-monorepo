import { type LearningScope, type LearningSource } from "../core/registry.js";
import type { LearningStatus } from "../core/types.js";
export type LearningStatusFilter = LearningStatus | "all";
export interface LearningListInput {
    readonly all?: boolean;
    readonly status?: LearningStatusFilter;
    readonly scope?: LearningScope | undefined;
    readonly shared?: readonly LearningSource[] | undefined;
}
export interface LearningListResult {
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly tags: readonly string[];
    readonly task: string;
    readonly created: string;
    readonly body: string;
    readonly backlog: string;
    readonly source: string;
}
export declare function learningList(root: string, input?: LearningListInput): Promise<LearningListResult[]>;
