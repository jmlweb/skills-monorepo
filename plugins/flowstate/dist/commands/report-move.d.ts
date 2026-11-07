import type { BacklogStore } from "../core/store.js";
import type { ReportDecision } from "../core/types.js";
export declare function reportMove(store: BacklogStore, id: string, status: ReportDecision, taskId?: string): Promise<{
    path: string;
}>;
