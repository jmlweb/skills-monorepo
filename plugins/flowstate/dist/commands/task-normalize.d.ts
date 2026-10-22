import type { BacklogStore } from "../core/store.js";
export interface TaskNormalizeResult {
    readonly id: string;
    readonly path: string;
    readonly changed: boolean;
}
export declare function taskNormalize(store: BacklogStore, id: string): Promise<TaskNormalizeResult>;
