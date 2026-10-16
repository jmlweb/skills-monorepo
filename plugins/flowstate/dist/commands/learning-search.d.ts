import { type LearningScope, type LearningSource } from "../core/registry.js";
export interface LearningSearchInput {
    readonly tags?: readonly string[] | undefined;
    readonly query?: string | undefined;
    readonly limit?: number | undefined;
    readonly includeBody?: boolean | undefined;
    readonly scope?: LearningScope | undefined;
    readonly shared?: readonly LearningSource[] | undefined;
}
export interface LearningSearchResult {
    readonly id: string;
    readonly title: string;
    readonly tags: readonly string[];
    readonly task: string;
    readonly created: string;
    readonly score: number;
    readonly reasons: readonly string[];
    readonly body?: string;
    readonly backlog: string;
    readonly source: string;
}
export declare function learningSearch(root: string, input: LearningSearchInput): Promise<LearningSearchResult[]>;
