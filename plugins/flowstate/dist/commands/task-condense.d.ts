export interface TaskCondenseResult {
    readonly id: string;
    readonly path: string;
    readonly condensed: boolean;
    readonly bytesBefore: number;
    readonly bytesAfter: number;
    readonly skippedReason?: string;
}
export declare function taskCondense(root: string, id: string): Promise<TaskCondenseResult>;
export declare function taskCondenseAll(root: string): Promise<TaskCondenseResult[]>;
