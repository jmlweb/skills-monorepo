import type { EntityType } from "./types.js";
import type { BacklogStore, BucketOf, CreateInput, StoredEntity, StoredType, TaskBucket } from "./store.js";
export declare class FileStore implements BacklogStore {
    readonly root: string;
    constructor(root: string);
    list<T extends StoredType>(type: T, buckets: readonly BucketOf<T>[]): Promise<StoredEntity[]>;
    find<T extends StoredType>(type: T, id: string, buckets: readonly BucketOf<T>[]): Promise<StoredEntity | undefined>;
    create(type: StoredType, input: CreateInput): Promise<StoredEntity>;
    save(entity: StoredEntity, frontmatter: Readonly<Record<string, unknown>>, body: string, to?: TaskBucket): Promise<StoredEntity>;
    private isMissingTypeFolder;
    private dir;
    private read;
    private addTaskIndexRow;
}
export declare function nextFileId(root: string, type: EntityType): Promise<string>;
