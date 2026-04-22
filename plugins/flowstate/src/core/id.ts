import type { EntityType } from "./types.js";
import { ENTITY_PREFIXES, PREFIX_TO_TYPE } from "./types.js";

export interface ParsedId {
  readonly type: EntityType;
  readonly num: number;
}

export function parseId(id: string): ParsedId {
  const match = id.match(/^([A-Z]{3})-(\d{3})$/);
  if (!match) {
    throw new Error(`Invalid ID format: "${id}". Expected format: XXX-000`);
  }

  const prefix = match[1]!;
  const type = PREFIX_TO_TYPE[prefix];
  if (!type) {
    throw new Error(`Unknown prefix: "${prefix}"`);
  }

  return { type, num: parseInt(match[2]!, 10) };
}

export function formatId(type: EntityType, num: number): string {
  return `${ENTITY_PREFIXES[type]}-${String(num).padStart(3, "0")}`;
}

export function normalizeIdInput(input: string, type: EntityType): string {
  const upper = input.toUpperCase();
  const prefix = ENTITY_PREFIXES[type];

  if (upper.startsWith(`${prefix}-`)) {
    const num = parseInt(upper.slice(prefix.length + 1), 10);
    return formatId(type, num);
  }

  const num = parseInt(input, 10);
  if (isNaN(num)) {
    throw new Error(`Cannot parse ID input: "${input}"`);
  }

  return formatId(type, num);
}
