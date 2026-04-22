export interface BacklogStats {
    readonly pending: number;
    readonly active: number;
    readonly blocked: number;
    readonly complete: number;
    readonly pendingIdeas: number;
    readonly pendingReports: number;
    readonly learnings: number;
}
export declare function stats(cwd: string): Promise<BacklogStats>;
