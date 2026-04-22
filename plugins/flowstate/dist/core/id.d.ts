import type { EntityType } from "./types.js";
export interface ParsedId {
    readonly type: EntityType;
    readonly num: number;
}
export declare function parseId(id: string): ParsedId;
export declare function formatId(type: EntityType, num: number): string;
export declare function normalizeIdInput(input: string, type: EntityType): string;
