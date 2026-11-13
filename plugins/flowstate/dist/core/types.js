import { InvalidArgumentError } from "./errors.js";
export const ENTITY_PREFIXES = {
    task: "TSK",
    idea: "PLN",
    report: "RPT",
    learning: "LRN",
};
export const PREFIX_TO_TYPE = {
    TSK: "task",
    PLN: "idea",
    RPT: "report",
    LRN: "learning",
};
const PRIORITIES = new Set(["P1", "P2", "P3", "P4"]);
const COMPLEXITIES = new Set(["low", "medium", "high"]);
const REPORT_TYPES = new Set(["bug", "finding", "improvement", "security"]);
const SEVERITIES = new Set(["critical", "high", "medium", "low"]);
export const validatePriority = (v) => {
    if (!PRIORITIES.has(v)) {
        throw new InvalidArgumentError(`Invalid priority: "${v}". Expected: P1, P2, P3, P4`);
    }
    return v;
};
export const validateComplexity = (v) => {
    if (!COMPLEXITIES.has(v)) {
        throw new InvalidArgumentError(`Invalid complexity: "${v}". Expected: low, medium, high`);
    }
    return v;
};
export const validateReportType = (v) => {
    if (!REPORT_TYPES.has(v)) {
        throw new InvalidArgumentError(`Invalid report type: "${v}". Expected: bug, finding, improvement, security`);
    }
    return v;
};
export const validateSeverity = (v) => {
    if (!SEVERITIES.has(v)) {
        throw new InvalidArgumentError(`Invalid severity: "${v}". Expected: critical, high, medium, low`);
    }
    return v;
};
// Titles live on one frontmatter line and in one index-table row; a line break would
// truncate the stored title and break the row.
export const validateTitle = (v) => {
    if (v.trim() === "") {
        throw new InvalidArgumentError("Invalid title: it must not be empty or whitespace-only.");
    }
    if (/[\r\n]/.test(v)) {
        throw new InvalidArgumentError("Invalid title: it must be a single line. Put the extra lines in --description or --body.");
    }
    return v;
};
// Free-text flags written to frontmatter must stay on one line: a line break would add a key.
export const validateSingleLine = (flag, v) => {
    if (/[\r\n]/.test(v)) {
        throw new InvalidArgumentError(`Invalid ${flag}: it must be a single line. Remove the line breaks, then retry.`);
    }
    return v;
};
// Three or more digits: GitHub-mode IDs are issue numbers, which outgrow the zero padding.
export const validateTaskId = (v) => {
    if (!/^TSK-\d{3,}$/.test(v)) {
        throw new InvalidArgumentError(`Invalid --task-id: ${JSON.stringify(v)}. Use a task ID like TSK-001.`);
    }
    return v;
};
const IDEA_DECISIONS = new Set(["approved", "discarded"]);
const REPORT_DECISIONS = new Set(["triaged", "discarded"]);
export const validateIdeaDecision = (v) => {
    if (!IDEA_DECISIONS.has(v)) {
        throw new InvalidArgumentError(`Invalid --status value: "${v}". Expected: approved, discarded`);
    }
    return v;
};
export const validateReportDecision = (v) => {
    if (!REPORT_DECISIONS.has(v)) {
        throw new InvalidArgumentError(`Invalid --status value: "${v}". Expected: triaged, discarded`);
    }
    return v;
};
