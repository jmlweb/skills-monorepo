export declare function reportMove(root: string, id: string, status: "triaged" | "discarded", taskId?: string): Promise<{
    path: string;
}>;
