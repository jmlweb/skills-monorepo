import type { Dirent } from "node:fs";
import type { ParsedDocument } from "./types.js";
export declare function readEntity(path: string): Promise<ParsedDocument>;
export declare function writeEntity(path: string, frontmatter: Record<string, unknown>, body: string): Promise<void>;
export declare function moveFile(src: string, dst: string): Promise<void>;
export declare function ensureDir(path: string): Promise<void>;
export declare function listFiles(dir: string): Promise<Dirent[]>;
export declare function findEntityFile(dir: string, idPrefix: string): Promise<string | undefined>;
