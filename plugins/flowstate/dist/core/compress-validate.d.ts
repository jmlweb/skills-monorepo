/**
 * Validates that a compressed body preserves all load-bearing content from the original.
 *
 * Used by `task-compress` and `learning-compress` to gate LLM-rewritten bodies against
 * structural / referential breakage. Catches dropped IDs, URLs, dates, code, headings,
 * or modifications to protected sections. Cannot detect semantic loss — only structure.
 */
export interface CompressValidationResult {
    readonly ok: boolean;
    readonly errors: readonly string[];
    readonly bytesBefore: number;
    readonly bytesAfter: number;
}
export interface CompressValidationOptions {
    readonly protectedSections?: readonly string[];
}
export declare function validateCompression(original: string, compressed: string, opts?: CompressValidationOptions): CompressValidationResult;
