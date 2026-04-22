export declare function reportMove(cwd: string, id: string, status: "triaged" | "discarded", taskId?: string): Promise<{
    path: string;
}>;
