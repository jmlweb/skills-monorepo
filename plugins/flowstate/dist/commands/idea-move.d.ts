export declare function ideaMove(cwd: string, id: string, status: "approved" | "discarded", taskId?: string): Promise<{
    path: string;
}>;
