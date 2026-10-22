export type StoredType = "task" | "idea" | "report";
export type TaskBucket = "pending" | "active" | "complete";
export type ClosableBucket = "pending" | "complete";
export type BucketOf<T extends StoredType> = T extends "task" ? TaskBucket : ClosableBucket;
export declare const BUCKETS: {
    readonly [T in StoredType]: readonly BucketOf<T>[];
};
export interface StoredEntity {
    readonly type: StoredType;
    readonly id: string;
    readonly bucket: TaskBucket;
    readonly frontmatter: Readonly<Record<string, unknown>>;
    readonly body: string;
    readonly path: string;
}
export interface CreateInput {
    readonly title: string;
    readonly frontmatter: (id: string) => Record<string, unknown>;
    readonly body: string;
}
export interface BacklogStore {
    list<T extends StoredType>(type: T, buckets: readonly BucketOf<T>[]): Promise<StoredEntity[]>;
    find<T extends StoredType>(type: T, id: string, buckets: readonly BucketOf<T>[]): Promise<StoredEntity | undefined>;
    create(type: StoredType, input: CreateInput): Promise<StoredEntity>;
    save(entity: StoredEntity, frontmatter: Readonly<Record<string, unknown>>, body: string, to?: TaskBucket): Promise<StoredEntity>;
}
