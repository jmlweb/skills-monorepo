export interface LearningCompressResult {
    readonly id: string;
    readonly path: string;
    readonly ok: boolean;
    readonly bytesBefore: number;
    readonly bytesAfter: number;
    readonly errors: readonly string[];
    readonly skippedReason?: string;
}
export declare function learningCompress(root: string, id: string, newBody: string): Promise<LearningCompressResult>;
