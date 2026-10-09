export declare function appendToSection(content: string, heading: string, text: string): string;
export declare function hasSection(content: string, heading: string): boolean;
export declare function tickCriteria(body: string, indexes: readonly number[], evidence?: Readonly<Record<number, string>>, date?: string): string;
/** 1-based numbers of ticked criteria that carry no evidence suffix. */
export declare function unverifiedCriteria(body: string): number[];
export declare function appendToBody(body: string, entry: string): string;
export declare function addTableRow(content: string, heading: string, row: string): string;
export declare function removeTableRow(content: string, heading: string, predicate: (row: string) => boolean): string;
export declare function replaceSection(content: string, heading: string, newContent: string): string;
export declare function updateStatsTable(content: string, stats: Record<string, number>): string;
/**
 * Prepare an idea-style Markdown body for embedding under a task's own
 * `## Description`: its `## Notes` is lifted out (to merge into the task's
 * Notes) and remaining `##` headings are demoted so they nest, not sibling.
 */
export declare function embedUnderDescription(markdown: string): {
    readonly description: string;
    readonly notes: string;
};
/** Collapse repeated `## Notes` sections into the first one. */
export declare function mergeDuplicateNotes(body: string): string;
