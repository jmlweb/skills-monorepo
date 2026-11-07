import type { GhRunner } from "./gh.js";
import type { BacklogStore, BucketOf, CreateInput, StoredEntity, StoredType, TaskBucket } from "./store.js";
export declare const TYPE_LABELS: Readonly<Record<StoredType, string>>;
export declare const STATUS_LABELS: {
    readonly active: "status:active";
    readonly blocked: "status:blocked";
    readonly approved: "status:approved";
    readonly discarded: "status:discarded";
    readonly triaged: "status:triaged";
};
export declare const PRIORITY_LABELS: readonly string[];
export declare const FINAL_STATE_LABELS: Readonly<Record<"idea" | "report", Readonly<Record<string, string>>>>;
export interface LabelSpec {
    readonly name: string;
    readonly color: string;
    readonly description: string;
}
export declare const FLOWSTATE_LABELS: readonly LabelSpec[];
export declare const LIST_LIMIT = 1000;
export interface LabelDiff {
    readonly add: readonly string[];
    readonly remove: readonly string[];
}
export interface InspectedIssue {
    readonly type: StoredType;
    readonly number: number;
    readonly url: string;
    readonly labels: readonly string[];
    readonly entity: StoredEntity | undefined;
    readonly error: string | undefined;
}
export declare class GithubStore implements BacklogStore {
    readonly repo: string;
    private readonly gh;
    private readonly issues;
    private existingLabels;
    constructor(repo: string, gh: GhRunner);
    list<T extends StoredType>(type: T, buckets: readonly BucketOf<T>[]): Promise<StoredEntity[]>;
    find<T extends StoredType>(type: T, id: string, buckets: readonly BucketOf<T>[]): Promise<StoredEntity | undefined>;
    create(type: StoredType, input: CreateInput): Promise<StoredEntity>;
    save(entity: StoredEntity, frontmatter: Readonly<Record<string, unknown>>, body: string, to?: TaskBucket): Promise<StoredEntity>;
    inspect(type: StoredType): Promise<InspectedIssue[]>;
    repairLabels(entity: StoredEntity, apply: boolean): Promise<LabelDiff>;
    private fetchIssues;
    private listIssues;
    private viewIssue;
    private issueOf;
    private assertType;
    private toEntity;
    private finalState;
    private desiredLabels;
    private labelDiff;
    private ensureLabels;
}
