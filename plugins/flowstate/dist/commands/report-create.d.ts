import type { ReportType, Severity } from "../core/types.js";
import type { BacklogStore } from "../core/store.js";
export interface ReportCreateInput {
    readonly title: string;
    readonly type: ReportType;
    readonly severity: Severity;
    readonly body: string;
}
export declare function reportCreate(store: BacklogStore, input: ReportCreateInput): Promise<{
    id: string;
    path: string;
}>;
