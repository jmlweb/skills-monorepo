export declare const METADATA_FENCE = "```flowstate";
export interface SplitBody {
    readonly metadata: Record<string, unknown>;
    readonly body: string;
}
export declare function splitMetadataBlock(issueBody: string, issueNumber: number): SplitBody;
export declare function joinMetadataBlock(metadata: Readonly<Record<string, unknown>>, body: string): string;
