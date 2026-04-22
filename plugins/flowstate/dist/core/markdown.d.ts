export declare function appendToSection(content: string, heading: string, text: string): string;
export declare function addTableRow(content: string, heading: string, row: string): string;
export declare function removeTableRow(content: string, heading: string, predicate: (row: string) => boolean): string;
export declare function replaceSection(content: string, heading: string, newContent: string): string;
export declare function updateStatsTable(content: string, stats: Record<string, number>): string;
