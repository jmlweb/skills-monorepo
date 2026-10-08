import type { Complexity } from "../core/types.js";
export interface IdeaCreateInput {
    readonly title: string;
    readonly complexity: Complexity;
    readonly body: string;
}
export declare function ideaCreate(root: string, input: IdeaCreateInput): Promise<{
    id: string;
    path: string;
}>;
