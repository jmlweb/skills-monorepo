export interface LearningSearchInput {
    readonly tags?: readonly string[] | undefined;
    readonly query?: string | undefined;
    readonly limit?: number | undefined;
    readonly includeBody?: boolean | undefined;
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
}
export declare function learningSearch(cwd: string, input: LearningSearchInput): Promise<LearningSearchResult[]>;
