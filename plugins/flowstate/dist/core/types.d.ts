export type EntityType = "task" | "idea" | "report" | "learning";
export type Priority = "P1" | "P2" | "P3" | "P4";
export type TaskStatus = "pending" | "active" | "blocked" | "complete";
export type IdeaStatus = "pending" | "approved" | "discarded";
export type ReportStatus = "pending" | "triaged" | "discarded";
export type LearningStatus = "active" | "superseded" | "archived";
export type ReportType = "bug" | "finding" | "improvement" | "security";
export type Severity = "critical" | "high" | "medium" | "low";
export type Complexity = "low" | "medium" | "high";
export declare const ENTITY_PREFIXES: Record<EntityType, string>;
export declare const PREFIX_TO_TYPE: Record<string, EntityType>;
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
export type Frontmatter = TaskFrontmatter | IdeaFrontmatter | ReportFrontmatter | LearningFrontmatter;
export declare const validatePriority: (v: string) => Priority;
export declare const validateComplexity: (v: string) => Complexity;
export declare const validateReportType: (v: string) => ReportType;
export declare const validateSeverity: (v: string) => Severity;
export interface ParsedDocument<T = Record<string, unknown>> {
    readonly frontmatter: T;
    readonly body: string;
}
