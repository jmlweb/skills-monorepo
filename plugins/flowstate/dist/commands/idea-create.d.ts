import type { Complexity } from "../core/types.js";
import type { BacklogStore } from "../core/store.js";
export interface IdeaCreateInput {
    readonly title: string;
    readonly complexity: Complexity;
    readonly body: string;
}
export declare function ideaCreate(store: BacklogStore, input: IdeaCreateInput): Promise<{
    id: string;
    path: string;
}>;
