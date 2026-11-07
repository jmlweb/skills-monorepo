// The storage seam for tasks, ideas and reports. Commands talk to a BacklogStore, never to
// paths, so a non-file backend can stand in later. Learnings stay file-based on purpose.
export const BUCKETS = {
    task: ["pending", "active", "complete"],
    idea: ["pending", "complete"],
    report: ["pending", "complete"],
};
// Buckets a blocked task can sit in; "blocked" is a status, never a folder.
export const BLOCKABLE_BUCKETS = ["pending", "active"];
// The one rule that turns a bucket plus frontmatter into a task status. Every reader
// (doctor, list, stats, index) derives status here so a non-file backend maps the same way.
export function taskStatusOf(bucket, frontmatter) {
    return bucket !== "complete" && Boolean(frontmatter["blocked-by"]) ? "blocked" : bucket;
}
