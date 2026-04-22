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
    if (!PRIORITIES.has(v))
        throw new Error(`Invalid priority: "${v}". Expected: P1, P2, P3, P4`);
    return v;
};
export const validateComplexity = (v) => {
    if (!COMPLEXITIES.has(v))
        throw new Error(`Invalid complexity: "${v}". Expected: low, medium, high`);
    return v;
};
export const validateReportType = (v) => {
    if (!REPORT_TYPES.has(v))
        throw new Error(`Invalid report type: "${v}". Expected: bug, finding, improvement, security`);
    return v;
};
export const validateSeverity = (v) => {
    if (!SEVERITIES.has(v))
        throw new Error(`Invalid severity: "${v}". Expected: critical, high, medium, low`);
    return v;
};
