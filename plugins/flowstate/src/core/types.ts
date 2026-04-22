export type EntityType = "task" | "idea" | "report" | "learning";

export type Priority = "P1" | "P2" | "P3" | "P4";

export type TaskStatus = "pending" | "active" | "blocked" | "complete";
export type IdeaStatus = "pending" | "approved" | "discarded";
export type ReportStatus = "pending" | "triaged" | "discarded";
export type LearningStatus = "active" | "superseded" | "archived";

export type ReportType = "bug" | "finding" | "improvement" | "security";
export type Severity = "critical" | "high" | "medium" | "low";
export type Complexity = "low" | "medium" | "high";

export const ENTITY_PREFIXES: Record<EntityType, string> = {
  task: "TSK",
  idea: "PLN",
  report: "RPT",
  learning: "LRN",
} as const;

export const PREFIX_TO_TYPE: Record<string, EntityType> = {
  TSK: "task",
  PLN: "idea",
  RPT: "report",
  LRN: "learning",
} as const;

export interface TaskFrontmatter {
  readonly id: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly priority: Priority;
  readonly tags: readonly string[];
  readonly created: string;
  readonly source: string;
  readonly "depends-on": readonly string[];
  readonly started?: string;
  readonly completed?: string;
  readonly "blocked-by"?: string;
}

export interface IdeaFrontmatter {
  readonly id: string;
  readonly title: string;
  readonly status: IdeaStatus;
  readonly created: string;
  readonly complexity: Complexity;
  readonly reviewed?: string;
  readonly "task-id"?: string;
}

export interface ReportFrontmatter {
  readonly id: string;
  readonly title: string;
  readonly type: ReportType;
  readonly severity: Severity;
  readonly status: ReportStatus;
  readonly created: string;
  readonly triaged?: string;
  readonly "task-id"?: string;
}

export interface LearningFrontmatter {
  readonly id: string;
  readonly title: string;
  readonly status: LearningStatus;
  readonly tags: readonly string[];
  readonly task: string;
  readonly created: string;
}

export type Frontmatter =
  | TaskFrontmatter
  | IdeaFrontmatter
  | ReportFrontmatter
  | LearningFrontmatter;

const PRIORITIES = new Set<string>(["P1", "P2", "P3", "P4"]);
const COMPLEXITIES = new Set<string>(["low", "medium", "high"]);
const REPORT_TYPES = new Set<string>(["bug", "finding", "improvement", "security"]);
const SEVERITIES = new Set<string>(["critical", "high", "medium", "low"]);

export const validatePriority = (v: string): Priority => {
  if (!PRIORITIES.has(v)) throw new Error(`Invalid priority: "${v}". Expected: P1, P2, P3, P4`);
  return v as Priority;
};

export const validateComplexity = (v: string): Complexity => {
  if (!COMPLEXITIES.has(v)) throw new Error(`Invalid complexity: "${v}". Expected: low, medium, high`);
  return v as Complexity;
};

export const validateReportType = (v: string): ReportType => {
  if (!REPORT_TYPES.has(v)) throw new Error(`Invalid report type: "${v}". Expected: bug, finding, improvement, security`);
  return v as ReportType;
};

export const validateSeverity = (v: string): Severity => {
  if (!SEVERITIES.has(v)) throw new Error(`Invalid severity: "${v}". Expected: critical, high, medium, low`);
  return v as Severity;
};

export interface ParsedDocument<T = Record<string, unknown>> {
  readonly frontmatter: T;
  readonly body: string;
}
