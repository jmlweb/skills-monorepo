import { InvalidArgumentError } from "./errors.js";
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
const CRITERION_PATTERN = /^- \[[ xX]\] /;
const EVIDENCE_MARKER = " — evidence: ";
export function tickCriteria(body, indexes, evidence = {}, date = "") {
    const lines = body.split("\n");
    const { start, end } = findSection(lines, "Acceptance Criteria");
    const criterionLines = [];
    for (let i = start; i < end; i++) {
        if (CRITERION_PATTERN.test(lines[i]))
            criterionLines.push(i);
    }
    for (const index of indexes) {
        const lineIndex = Number.isInteger(index) ? criterionLines[index - 1] : undefined;
        if (lineIndex === undefined) {
            throw new InvalidArgumentError(`Criterion ${index} is out of range: task has ${criterionLines.length} criteria (use 1-${criterionLines.length}).`);
        }
        let line = lines[lineIndex].replace(/^- \[ \] /, "- [x] ");
        const proof = evidence[index];
        if (proof !== undefined) {
            const markerAt = line.indexOf(EVIDENCE_MARKER);
            const base = markerAt === -1 ? line : line.slice(0, markerAt);
            const flat = proof.replace(/\s*\n\s*/g, " ").trim();
            line = `${base}${EVIDENCE_MARKER}${flat}${date ? ` (${date})` : ""}`;
        }
        lines[lineIndex] = line;
    }
    return lines.join("\n");
}
/** 1-based numbers of ticked criteria that carry no evidence suffix. */
export function unverifiedCriteria(body) {
    if (!hasSection(body, "Acceptance Criteria"))
        return [];
    const lines = body.split("\n");
    const { start, end } = findSection(lines, "Acceptance Criteria");
    const unverified = [];
    let position = 0;
    for (let i = start; i < end; i++) {
        const line = lines[i];
        if (!CRITERION_PATTERN.test(line))
            continue;
        position++;
        if (/^- \[[xX]\] /.test(line) && !line.includes(EVIDENCE_MARKER)) {
            unverified.push(position);
        }
    }
    return unverified;
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
const FENCE_PATTERN = /^\s*(```|~~~)/;
const NOTES_HEADING = /^##\s+Notes\s*$/;
// Fence-aware so a "## Notes" inside a code sample is never treated as a heading.
function splitNotes(lines) {
    const rest = [];
    const notes = [];
    let firstAt = -1;
    let inFence = false;
    let inNotes = false;
    for (const line of lines) {
        if (FENCE_PATTERN.test(line))
            inFence = !inFence;
        if (!inFence && NOTES_HEADING.test(line)) {
            if (firstAt === -1)
                firstAt = rest.length;
            inNotes = true;
            continue;
        }
        if (!inFence && inNotes && /^#{1,2}\s/.test(line))
            inNotes = false;
        if (inNotes)
            notes.push(line);
        else
            rest.push(line);
    }
    return { rest, notes, firstAt };
}
/**
 * Prepare an idea-style Markdown body for embedding under a task's own
 * `## Description`: its `## Notes` is lifted out (to merge into the task's
 * Notes) and remaining `##` headings are demoted so they nest, not sibling.
 */
export function embedUnderDescription(markdown) {
    const { rest, notes } = splitNotes(markdown.split("\n"));
    let inFence = false;
    const demoted = rest.map((line) => {
        if (FENCE_PATTERN.test(line))
            inFence = !inFence;
        return !inFence && /^##\s/.test(line) ? `#${line}` : line;
    });
    return {
        description: demoted.join("\n").trim(),
        notes: notes.join("\n").trim(),
    };
}
/** Collapse repeated `## Notes` sections into the first one. */
export function mergeDuplicateNotes(body) {
    const { rest, notes, firstAt } = splitNotes(body.split("\n"));
    const headings = body.split("\n").filter((l) => NOTES_HEADING.test(l)).length;
    if (headings < 2)
        return body;
    const merged = notes.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    const block = ["## Notes", "", ...(merged ? [merged, ""] : [""])];
    return [...rest.slice(0, firstAt), ...block, ...rest.slice(firstAt)].join("\n");
}
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
