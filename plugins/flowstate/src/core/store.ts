// The storage seam for tasks, ideas and reports. Commands talk to a BacklogStore, never to
// paths, so a non-file backend can stand in later. Learnings stay file-based on purpose.

import type { TaskStatus } from "./types.js";

export type StoredType = "task" | "idea" | "report";

// Where an entity sits, not its frontmatter status: task-block never moves a file, so a
// blocked task stays in "pending" or "active" (LRN-040), and every approved, discarded or
// triaged idea or report sits in "complete".
export type TaskBucket = "pending" | "active" | "complete";
export type ClosableBucket = "pending" | "complete";

export type BucketOf<T extends StoredType> = T extends "task" ? TaskBucket : ClosableBucket;

export const BUCKETS: { readonly [T in StoredType]: readonly BucketOf<T>[] } = {
  task: ["pending", "active", "complete"],
  idea: ["pending", "complete"],
  report: ["pending", "complete"],
};

// Buckets a blocked task can sit in; "blocked" is a status, never a folder.
export const BLOCKABLE_BUCKETS: readonly TaskBucket[] = ["pending", "active"];

// The one rule that turns a bucket plus frontmatter into a task status. Every reader
// (doctor, list, stats, index) derives status here so a non-file backend maps the same way.
export function taskStatusOf(
  bucket: TaskBucket,
  frontmatter: Readonly<Record<string, unknown>>,
): TaskStatus {
  return bucket !== "complete" && Boolean(frontmatter["blocked-by"]) ? "blocked" : bucket;
}

export interface StoredEntity {
  readonly type: StoredType;
  readonly id: string;
  readonly bucket: TaskBucket;
  readonly frontmatter: Readonly<Record<string, unknown>>;
  readonly body: string;
  // A file path today; a backend without files returns its own locator (e.g. an issue URL).
  readonly path: string;
}

export interface CreateInput {
  readonly title: string;
  // Called with the ID the store assigns, so the ID can live inside the frontmatter.
  readonly frontmatter: (id: string) => Record<string, unknown>;
  readonly body: string;
}

export interface BacklogStore {
  // Lists the given buckets in order. A missing bucket reads as empty; a missing backlog throws.
  list<T extends StoredType>(type: T, buckets: readonly BucketOf<T>[]): Promise<StoredEntity[]>;
  // Undefined means "not in these buckets"; callers turn that into EntityNotFoundError.
  find<T extends StoredType>(
    type: T,
    id: string,
    buckets: readonly BucketOf<T>[],
  ): Promise<StoredEntity | undefined>;
  // Assigns the ID and stores the entity in "pending".
  create(type: StoredType, input: CreateInput): Promise<StoredEntity>;
  // Replaces frontmatter and body; with `to`, also moves the entity to that bucket.
  save(
    entity: StoredEntity,
    frontmatter: Readonly<Record<string, unknown>>,
    body: string,
    to?: TaskBucket,
  ): Promise<StoredEntity>;
}
