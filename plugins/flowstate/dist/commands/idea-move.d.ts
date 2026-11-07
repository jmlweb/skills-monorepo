import type { BacklogStore } from "../core/store.js";
import type { IdeaDecision } from "../core/types.js";
export declare function ideaMove(store: BacklogStore, id: string, status: IdeaDecision, taskId?: string): Promise<{
    path: string;
}>;
