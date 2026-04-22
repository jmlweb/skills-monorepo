import type { LearningStatus } from "../core/types.js";
export declare function learningMove(cwd: string, id: string, status: "archived"): Promise<{
    id: string;
    status: LearningStatus;
    path: string;
}>;
