import type { BacklogStore } from "../core/store.js";
export declare function taskBlock(store: BacklogStore, id: string, reason: string): Promise<{
    path: string;
}>;
