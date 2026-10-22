import type { BacklogStore } from "../core/store.js";
export declare function taskMove(store: BacklogStore, id: string, to: "active" | "complete" | "pending"): Promise<{
    path: string;
    unverifiedCriteria?: number[];
}>;
