import type { BacklogStore } from "../core/store.js";
export declare function taskUnblock(store: BacklogStore, id: string, resolution?: string): Promise<{
    path: string;
}>;
