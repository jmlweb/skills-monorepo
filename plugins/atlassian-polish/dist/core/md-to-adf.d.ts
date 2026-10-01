import type { AdfDoc } from "./adf-types.js";
export interface ConvertOptions {
    /** Injectable so tests get deterministic task localIds. */
    readonly newId?: () => string;
}
export declare function markdownToAdf(markdown: string, options?: ConvertOptions): AdfDoc;
