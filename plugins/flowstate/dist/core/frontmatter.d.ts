import type { ParsedDocument } from "./types.js";
export declare function parseFrontmatter(content: string): ParsedDocument;
export declare function serializeFrontmatter(frontmatter: Record<string, unknown>, body: string): string;
