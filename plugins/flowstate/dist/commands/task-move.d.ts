export declare function taskMove(cwd: string, id: string, to: "active" | "complete" | "pending"): Promise<{
    path: string;
}>;
