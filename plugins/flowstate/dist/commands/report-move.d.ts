import type { BacklogStore } from "../core/store.js";
export declare function reportMove(store: BacklogStore, id: string, status: "triaged" | "discarded", taskId?: string): Promise<{
    path: string;
}>;
