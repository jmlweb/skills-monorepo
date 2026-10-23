import type { BacklogStore } from "../core/store.js";
export type ReportListStatus = "pending" | "complete" | "all";
export interface ReportListInput {
    readonly status?: ReportListStatus;
    readonly limit?: number;
}
export interface ReportListItem {
    readonly id: string;
    readonly title: string;
    readonly type: string;
    readonly severity: string;
    readonly status: string;
    readonly created: string;
    readonly triaged: string | undefined;
    readonly taskId: string | undefined;
    readonly path: string;
}
export declare function reportList(store: BacklogStore, input?: ReportListInput): Promise<ReportListItem[]>;
