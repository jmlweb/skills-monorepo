/**
 * Validates that a compressed body preserves all load-bearing content from the original.
 *
 * Used by `task-compress` and `learning-compress` to gate LLM-rewritten bodies against
 * structural / referential breakage. Catches dropped IDs, URLs, dates, code, headings,
 * or modifications to protected sections. Cannot detect semantic loss — only structure.
 */
const stripTrailingPunct = (s) => s.replace(/[.,;:!?]+$/, "");
const TOKEN_PATTERNS = [
    { name: "URL", pattern: /https?:\/\/[^\s<>)\]"']+/g, normalize: stripTrailingPunct },
    { name: "ID", pattern: /\b(?:TSK|LRN|PLN|RPT)-\d{3,}\b/gi },
    { name: "date", pattern: /\b\d{4}-\d{2}-\d{2}\b/g },
    { name: "version", pattern: /\bv\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?\b/g },
];
const CODE_BLOCK_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`\n]+`/g;
export function validateCompression(original, compressed, opts = {}) {
    const errors = [];
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
        const norm = normalize ?? ((s) => s);
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
    if (origHeadings.length !== newHeadings.length ||
        origHeadings.some((h, i) => h !== newHeadings[i])) {
        errors.push(`heading mismatch: expected [${origHeadings.join(" | ")}], got [${newHeadings.join(" | ")}]`);
    }
    for (const section of opts.protectedSections ?? []) {
        const origSec = extractSection(original, section);
        const newSec = extractSection(compressed, section);
        if (origSec === undefined && newSec === undefined)
            continue;
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
function matchAll(text, pattern) {
    return [...text.matchAll(pattern)].map((m) => m[0]);
}
function stripCodeBlocks(text) {
    return text.replace(CODE_BLOCK_RE, "");
}
function multisetDiff(needles, haystack) {
    const remaining = [...haystack];
    const missing = [];
    for (const needle of needles) {
        const idx = remaining.indexOf(needle);
        if (idx === -1)
            missing.push(needle);
        else
            remaining.splice(idx, 1);
    }
    return missing;
}
function extractHeadings(text) {
    return text
        .split("\n")
        .filter((l) => /^#{1,6}\s/.test(l))
        .map((l) => l.trim());
}
function extractSection(content, heading) {
    const lines = content.split("\n");
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const headingPattern = new RegExp(`^##\\s+${escaped}\\s*$`);
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
        if (headingPattern.test(lines[i])) {
            start = i + 1;
            break;
        }
    }
    if (start === -1)
        return undefined;
    let end = lines.length;
    for (let i = start; i < lines.length; i++) {
        if (/^#{1,2}\s/.test(lines[i])) {
            end = i;
            break;
        }
    }
    return lines.slice(start, end).join("\n");
}
function truncate(s, max = 60) {
    return s.length <= max ? s : s.slice(0, max) + "...";
}
