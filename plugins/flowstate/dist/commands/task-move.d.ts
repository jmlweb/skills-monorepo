export declare function taskMove(root: string, id: string, to: "active" | "complete" | "pending"): Promise<{
    path: string;
    unverifiedCriteria?: number[];
}>;
