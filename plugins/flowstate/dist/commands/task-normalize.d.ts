export interface TaskNormalizeResult {
    readonly id: string;
    readonly path: string;
    readonly changed: boolean;
}
export declare function taskNormalize(root: string, id: string): Promise<TaskNormalizeResult>;
