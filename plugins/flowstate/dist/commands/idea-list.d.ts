import type { BacklogStore } from "../core/store.js";
export type IdeaListStatus = "pending" | "complete" | "all";
export interface IdeaListInput {
    readonly status?: IdeaListStatus;
    readonly limit?: number;
}
export interface IdeaListItem {
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly complexity: string;
    readonly created: string;
    readonly reviewed: string | undefined;
    readonly taskId: string | undefined;
    readonly path: string;
}
export declare function ideaList(store: BacklogStore, input?: IdeaListInput): Promise<IdeaListItem[]>;
