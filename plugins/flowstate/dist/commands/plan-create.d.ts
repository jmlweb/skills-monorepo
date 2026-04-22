import type { Complexity } from "../core/types.js";
export interface PlanCreateInput {
    readonly title: string;
    readonly complexity: Complexity;
    readonly body: string;
}
export declare function planCreate(cwd: string, input: PlanCreateInput): Promise<{
    id: string;
    path: string;
}>;
