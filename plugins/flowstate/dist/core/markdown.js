/**
 * Find the line range [start, end) of a markdown section's content.
 * start = first content line after the heading
 * end = line before next heading of same or higher level, or EOF
 */
function findSection(lines, heading) {
    const headingPattern = new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$`);
    let headingIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (headingPattern.test(lines[i])) {
            headingIndex = i;
            break;
        }
    }
    if (headingIndex === -1) {
        throw new Error(`Section "${heading}" not found`);
    }
    // Skip blank line after heading
    let start = headingIndex + 1;
    if (start < lines.length && lines[start].trim() === "") {
        start++;
    }
    // Find next section of same or higher level
    let end = lines.length;
    for (let i = headingIndex + 1; i < lines.length; i++) {
        if (/^#{1,2}\s/.test(lines[i])) {
            end = i;
            break;
        }
    }
    // Trim trailing blank lines from section
    while (end > start && lines[end - 1].trim() === "") {
        end--;
    }
    return { start, end };
}
export function appendToSection(content, heading, text) {
    const lines = content.split("\n");
    const { end } = findSection(lines, heading);
    lines.splice(end, 0, text);
    return lines.join("\n");
}
export function hasSection(content, heading) {
    const headingPattern = new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$`);
    return content.split("\n").some((line) => headingPattern.test(line));
}
export function appendToBody(body, entry) {
    const lines = body.split("\n");
    let insertIndex = lines.length;
    while (insertIndex > 0 && lines[insertIndex - 1].trim() === "") {
        insertIndex--;
    }
    lines.splice(insertIndex, 0, entry);
    return lines.join("\n");
}
export function addTableRow(content, heading, row) {
    const lines = content.split("\n");
    const { end } = findSection(lines, heading);
    lines.splice(end, 0, row);
    return lines.join("\n");
}
export function removeTableRow(content, heading, predicate) {
    const lines = content.split("\n");
    const { start, end } = findSection(lines, heading);
    for (let i = start; i < end; i++) {
        const line = lines[i];
        if (line.startsWith("|") && !line.startsWith("|--") && predicate(line) && i !== start) {
            lines.splice(i, 1);
            return lines.join("\n");
        }
    }
    return content;
}
export function replaceSection(content, heading, newContent) {
    const lines = content.split("\n");
    const headingPattern = new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$`);
    let headingIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (headingPattern.test(lines[i])) {
            headingIndex = i;
            break;
        }
    }
    if (headingIndex === -1) {
        throw new Error(`Section "${heading}" not found`);
    }
    // Find next section
    let nextSectionIndex = lines.length;
    for (let i = headingIndex + 1; i < lines.length; i++) {
        if (/^#{1,2}\s/.test(lines[i])) {
            nextSectionIndex = i;
            break;
        }
    }
    const replacement = [`## ${heading}`, "", newContent, ""];
    lines.splice(headingIndex, nextSectionIndex - headingIndex, ...replacement);
    return lines.join("\n");
}
export function updateStatsTable(content, stats) {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.startsWith("|"))
            continue;
        for (const [label, count] of Object.entries(stats)) {
            const pattern = new RegExp(`^\\|\\s*${escapeRegex(label)}\\s*\\|\\s*\\d+\\s*\\|$`);
            if (pattern.test(line)) {
                lines[i] = `| ${label} | ${count} |`;
            }
        }
    }
    return lines.join("\n");
}
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
