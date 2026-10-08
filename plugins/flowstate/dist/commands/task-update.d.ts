export declare function parseEvidence(value: string | undefined): Record<number, string>;
export declare function taskUpdate(root: string, id: string, updates: Record<string, string>, log?: string, checkCriteria?: readonly number[], evidence?: Readonly<Record<number, string>>): Promise<{
    path: string;
}>;
