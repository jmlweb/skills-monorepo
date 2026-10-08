export declare function taskUpdate(root: string, id: string, updates: Record<string, string>, log?: string, checkCriteria?: readonly number[]): Promise<{
    path: string;
}>;
