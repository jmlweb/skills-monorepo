export interface TaskCondenseResult {
    readonly id: string;
    readonly path: string;
    readonly condensed: boolean;
    readonly bytesBefore: number;
    readonly bytesAfter: number;
    readonly skippedReason?: string;
}
export declare function taskCondense(cwd: string, id: string): Promise<TaskCondenseResult>;
export declare function taskCondenseAll(cwd: string): Promise<TaskCondenseResult[]>;
