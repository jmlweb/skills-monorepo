import type { ReportType, Severity } from "../core/types.js";
export interface ReportCreateInput {
    readonly title: string;
    readonly type: ReportType;
    readonly severity: Severity;
    readonly body: string;
}
export declare function reportCreate(cwd: string, input: ReportCreateInput): Promise<{
    id: string;
    path: string;
}>;
