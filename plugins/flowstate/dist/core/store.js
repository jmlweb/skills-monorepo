// The storage seam for tasks, ideas and reports. Commands talk to a BacklogStore, never to
// paths, so a non-file backend can stand in later. Learnings stay file-based on purpose.
export const BUCKETS = {
    task: ["pending", "active", "complete"],
    idea: ["pending", "complete"],
    report: ["pending", "complete"],
};
