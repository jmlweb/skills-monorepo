export declare function planMove(cwd: string, id: string, status: "approved" | "discarded", taskId?: string): Promise<{
    path: string;
}>;
