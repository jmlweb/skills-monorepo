export interface TaskCompressResult {
    readonly id: string;
    readonly path: string;
    readonly ok: boolean;
    readonly bytesBefore: number;
    readonly bytesAfter: number;
    readonly errors: readonly string[];
    readonly skippedReason?: string;
}
export declare function taskCompress(cwd: string, id: string, newBody: string): Promise<TaskCompressResult>;
