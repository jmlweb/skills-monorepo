import { InvalidArgumentError } from "./errors.js";
const DELIMITER = "---";
export function parseFrontmatter(content) {
    const lines = content.split("\n");
    if (lines[0] !== DELIMITER) {
        throw new InvalidArgumentError("Missing frontmatter opening delimiter");
    }
    const closingIndex = lines.indexOf(DELIMITER, 1);
    if (closingIndex === -1) {
        throw new InvalidArgumentError("Missing frontmatter closing delimiter");
    }
    const frontmatter = {};
    for (let i = 1; i < closingIndex; i++) {
        const line = lines[i];
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1)
            continue;
        const key = line.slice(0, colonIndex).trim();
        const rawValue = line.slice(colonIndex + 1).trim();
        frontmatter[key] = parseValue(rawValue);
    }
    const body = lines.slice(closingIndex + 1).join("\n");
    return { frontmatter, body };
}
function parseValue(raw) {
    if (raw.startsWith("[") && raw.endsWith("]")) {
        const inner = raw.slice(1, -1).trim();
        if (inner === "")
            return [];
        return inner.split(",").map((s) => s.trim());
    }
    return raw;
}
export function serializeFrontmatter(frontmatter, body) {
    const lines = [DELIMITER];
    for (const [key, value] of Object.entries(frontmatter)) {
        lines.push(`${key}: ${serializeValue(key, value)}`);
    }
    lines.push(DELIMITER);
    return lines.join("\n") + "\n" + body;
}
// The format is one key per line, and the parser lets a later key win, so a line break in a
// value would smuggle in an extra key that overrides the real one (RPT-028).
function serializeValue(key, value) {
    if (Array.isArray(value)) {
        if (value.length === 0)
            return "[]";
        return `[${value.map((item) => singleLine(key, String(item))).join(", ")}]`;
    }
    return singleLine(key, String(value));
}
function singleLine(key, text) {
    if (/[\r\n]/.test(text)) {
        throw new InvalidArgumentError(`Invalid frontmatter value for "${key}": it must be a single line. Remove the line breaks, then retry.`);
    }
    return text;
}
