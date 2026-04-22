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
        lines.push(`${key}: ${serializeValue(value)}`);
    }
    lines.push(DELIMITER);
    return lines.join("\n") + "\n" + body;
}
function serializeValue(value) {
    if (Array.isArray(value)) {
        if (value.length === 0)
            return "[]";
        return `[${value.join(", ")}]`;
    }
    return String(value);
}
