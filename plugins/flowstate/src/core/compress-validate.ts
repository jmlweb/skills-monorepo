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

interface TokenPattern {
  readonly name: string;
  readonly pattern: RegExp;
  readonly normalize?: (raw: string) => string;
}

const stripTrailingPunct = (s: string): string => s.replace(/[.,;:!?]+$/, "");

const TOKEN_PATTERNS: ReadonlyArray<TokenPattern> = [
  { name: "URL", pattern: /https?:\/\/[^\s<>)\]"']+/g, normalize: stripTrailingPunct },
  { name: "ID", pattern: /\b(?:TSK|LRN|PLN|RPT)-\d{3,}\b/gi },
  { name: "date", pattern: /\b\d{4}-\d{2}-\d{2}\b/g },
  { name: "version", pattern: /\bv\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?\b/g },
];

const CODE_BLOCK_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`\n]+`/g;

export function validateCompression(
  original: string,
  compressed: string,
  opts: CompressValidationOptions = {},
): CompressValidationResult {
  const errors: string[] = [];
  const bytesBefore = Buffer.byteLength(original, "utf-8");
  const bytesAfter = Buffer.byteLength(compressed, "utf-8");

  if (compressed.trim().length === 0) {
    errors.push("compressed body empty");
  }
  if (bytesAfter >= bytesBefore) {
    errors.push(`no shrink: ${bytesBefore} -> ${bytesAfter} bytes`);
  }

  const origBlocks = matchAll(original, CODE_BLOCK_RE);
  const newBlocks = matchAll(compressed, CODE_BLOCK_RE);
  for (const block of multisetDiff(origBlocks, newBlocks)) {
    errors.push(`missing code block: ${truncate(block)}`);
  }

  const origInline = matchAll(stripCodeBlocks(original), INLINE_CODE_RE);
  const newInline = matchAll(stripCodeBlocks(compressed), INLINE_CODE_RE);
  for (const code of multisetDiff(origInline, newInline)) {
    errors.push(`missing inline code: ${code}`);
  }

  for (const { name, pattern, normalize } of TOKEN_PATTERNS) {
    const norm = normalize ?? ((s: string) => s);
    const origTokens = new Set(matchAll(original, pattern).map(norm));
    const newTokens = new Set(matchAll(compressed, pattern).map(norm));
    for (const token of origTokens) {
      if (!newTokens.has(token)) {
        errors.push(`missing ${name}: ${token}`);
      }
    }
  }

  const origHeadings = extractHeadings(original);
  const newHeadings = extractHeadings(compressed);
  if (
    origHeadings.length !== newHeadings.length ||
    origHeadings.some((h, i) => h !== newHeadings[i])
  ) {
    errors.push(
      `heading mismatch: expected [${origHeadings.join(" | ")}], got [${newHeadings.join(" | ")}]`,
    );
  }

  for (const section of opts.protectedSections ?? []) {
    const origSec = extractSection(original, section);
    const newSec = extractSection(compressed, section);
    if (origSec === undefined && newSec === undefined) continue;
    if (origSec === undefined || newSec === undefined) {
      errors.push(`protected section "${section}" presence changed`);
      continue;
    }
    if (origSec !== newSec) {
      errors.push(`protected section "${section}" modified`);
    }
  }

  return { ok: errors.length === 0, errors, bytesBefore, bytesAfter };
}

function matchAll(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((m) => m[0]);
}

function stripCodeBlocks(text: string): string {
  return text.replace(CODE_BLOCK_RE, "");
}

function multisetDiff(needles: readonly string[], haystack: readonly string[]): string[] {
  const remaining = [...haystack];
  const missing: string[] = [];
  for (const needle of needles) {
    const idx = remaining.indexOf(needle);
    if (idx === -1) missing.push(needle);
    else remaining.splice(idx, 1);
  }
  return missing;
}

function extractHeadings(text: string): string[] {
  return text
    .split("\n")
    .filter((l) => /^#{1,6}\s/.test(l))
    .map((l) => l.trim());
}

function extractSection(content: string, heading: string): string | undefined {
  const lines = content.split("\n");
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headingPattern = new RegExp(`^##\\s+${escaped}\\s*$`);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingPattern.test(lines[i]!)) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return undefined;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (/^#{1,2}\s/.test(lines[i]!)) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function truncate(s: string, max = 60): string {
  return s.length <= max ? s : s.slice(0, max) + "...";
}
