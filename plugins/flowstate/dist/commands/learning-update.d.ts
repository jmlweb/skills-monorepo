export interface LearningUpdateInput {
    readonly title?: string;
    readonly tags?: readonly string[];
    readonly body?: string;
}
export declare function learningUpdate(cwd: string, id: string, input: LearningUpdateInput): Promise<{
    id: string;
    path: string;
}>;
