export interface LearningCreateInput {
    readonly title: string;
    readonly tags: readonly string[];
    readonly body: string;
    readonly task?: string | undefined;
}
export declare function learningCreate(root: string, input: LearningCreateInput): Promise<{
    id: string;
    path: string;
}>;
