import type { BacklogStore } from "../core/store.js";
export declare function ideaMove(store: BacklogStore, id: string, status: "approved" | "discarded", taskId?: string): Promise<{
    path: string;
}>;
