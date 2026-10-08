export declare function ideaMove(root: string, id: string, status: "approved" | "discarded", taskId?: string): Promise<{
    path: string;
}>;
