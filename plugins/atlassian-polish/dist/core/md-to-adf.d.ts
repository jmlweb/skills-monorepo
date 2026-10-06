import type { AdfDoc } from "./adf-types.js";
export interface ConvertOptions {
    /** Injectable so tests get deterministic task localIds. */
    readonly newId?: () => string;
    /**
     * Turn bare issue keys of these projects into Jira smart links. ADF stores a bare key as
     * plain text; only the Markdown write path auto-links it.
     */
    readonly issueLinks?: {
        readonly baseUrl: string;
        readonly projects: readonly string[];
    };
}
export declare function markdownToAdf(markdown: string, options?: ConvertOptions): AdfDoc;
