import type { GhRunner } from "./gh.js";
import { ghJson } from "./gh.js";
import { GhCommandError, GhIssueStateError, GhIssueTypeError } from "./errors.js";
import { ENTITY_PREFIXES } from "./types.js";
import { formatId } from "./id.js";
import { joinMetadataBlock, splitMetadataBlock } from "./metadata-block.js";
import type {
  BacklogStore,
  BucketOf,
  CreateInput,
  StoredEntity,
  StoredType,
  TaskBucket,
} from "./store.js";
import { taskStatusOf } from "./store.js";

// Label vocabulary. The type label says which entity an issue is; status labels carry the
// started/blocked flags and the final idea/report states; P1..P4 is the task priority;
// every other label on a task is one of its tags.
export const TYPE_LABELS: Readonly<Record<StoredType, string>> = {
  task: "flowstate:task",
  idea: "flowstate:idea",
  report: "flowstate:report",
};

export const STATUS_LABELS = {
  active: "status:active",
  blocked: "status:blocked",
  approved: "status:approved",
  discarded: "status:discarded",
  triaged: "status:triaged",
} as const;

export const PRIORITY_LABELS: readonly string[] = ["P1", "P2", "P3", "P4"];

// The one final-state label a closed idea or report must carry, keyed by the status value.
export const FINAL_STATE_LABELS: Readonly<Record<"idea" | "report", Readonly<Record<string, string>>>> = {
  idea: { approved: STATUS_LABELS.approved, discarded: STATUS_LABELS.discarded },
  report: { triaged: STATUS_LABELS.triaged, discarded: STATUS_LABELS.discarded },
};

export interface LabelSpec {
  readonly name: string;
  readonly color: string;
  readonly description: string;
}

// What `setup --github` creates. Tags are created on first use instead.
export const FLOWSTATE_LABELS: readonly LabelSpec[] = [
  { name: TYPE_LABELS.task, color: "0E8A16", description: "flowstate task" },
  { name: TYPE_LABELS.idea, color: "1D76DB", description: "flowstate idea (implementation plan)" },
  { name: TYPE_LABELS.report, color: "B60205", description: "flowstate report" },
  { name: STATUS_LABELS.active, color: "FBCA04", description: "task started" },
  { name: STATUS_LABELS.blocked, color: "D93F0B", description: "task blocked (reason in the metadata block)" },
  { name: STATUS_LABELS.approved, color: "0E8A16", description: "idea approved into a task" },
  { name: STATUS_LABELS.discarded, color: "CFD3D7", description: "idea or report discarded" },
  { name: STATUS_LABELS.triaged, color: "0E8A16", description: "report triaged into a task" },
  { name: "P1", color: "B60205", description: "priority P1" },
  { name: "P2", color: "D93F0B", description: "priority P2" },
  { name: "P3", color: "FBCA04", description: "priority P3" },
  { name: "P4", color: "C2E0C6", description: "priority P4" },
];

const TAG_LABEL_COLOR = "EDEDED";

// Frontmatter keys that live in the title or in labels; everything else goes in the block.
const NON_BLOCK_KEYS: ReadonlySet<string> = new Set(["id", "title", "status", "priority", "tags"]);

const ISSUE_FIELDS = "number,title,body,labels,state,url";

// Explicit so a silent cut at gh's default of 30 can never read as "fewer entities".
export const LIST_LIMIT = 1000;

interface GhLabel {
  readonly name: string;
}

interface GhIssue {
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly labels: readonly GhLabel[];
  readonly state: "OPEN" | "CLOSED";
  readonly url: string;
}

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

function isReservedLabel(name: string): boolean {
  return name.startsWith("flowstate:") || name.startsWith("status:") || PRIORITY_LABELS.includes(name);
}

function issueNumberOf(type: StoredType, id: string): number | undefined {
  const match = id.toUpperCase().match(/^([A-Z]{3})-(\d+)$/);
  if (!match || match[1] !== ENTITY_PREFIXES[type]) return undefined;
  return Number(match[2]);
}

function tagsOf(frontmatter: Readonly<Record<string, unknown>>): string[] {
  const raw = frontmatter["tags"];
  if (Array.isArray(raw)) return raw.map(String).filter((t) => t !== "");
  if (typeof raw === "string" && raw.trim() !== "") {
    return raw.split(",").map((t) => t.trim()).filter((t) => t !== "");
  }
  return [];
}

function blockOf(frontmatter: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(frontmatter).filter(([key]) => !NON_BLOCK_KEYS.has(key)));
}

// The GitHub Issues backend: one issue per task, idea or report; the issue number is the
// ID; labels carry type, status and priority; the metadata block carries the rest.
export class GithubStore implements BacklogStore {
  private readonly issues = new WeakMap<StoredEntity, GhIssue>();
  private existingLabels: Set<string> | undefined;

  constructor(
    readonly repo: string,
    private readonly gh: GhRunner,
  ) {}

  async list<T extends StoredType>(
    type: T,
    buckets: readonly BucketOf<T>[],
  ): Promise<StoredEntity[]> {
    const issues = await this.fetchIssues(type, buckets);
    const entities = issues.map((issue) => this.toEntity(type, issue));
    return buckets.flatMap((bucket) => entities.filter((entity) => entity.bucket === bucket));
  }

  async find<T extends StoredType>(
    type: T,
    id: string,
    buckets: readonly BucketOf<T>[],
  ): Promise<StoredEntity | undefined> {
    const number = issueNumberOf(type, id);
    if (number === undefined) return undefined;
    const issue = await this.viewIssue(number);
    if (!issue) return undefined;
    this.assertType(type, issue);
    const entity = this.toEntity(type, issue);
    return (buckets as readonly TaskBucket[]).includes(entity.bucket) ? entity : undefined;
  }

  async create(type: StoredType, input: CreateInput): Promise<StoredEntity> {
    // The ID is the issue number, known only after creation. Labels and the metadata block
    // do not depend on it, so a provisional frontmatter builds them and one create call
    // suffices; the returned frontmatter is rebuilt with the real ID.
    const provisional = input.frontmatter(formatId(type, 0));
    const labels = this.desiredLabels(type, provisional, "pending");
    await this.ensureLabels(labels);
    const out = await this.gh(
      [
        "issue", "create", "--repo", this.repo,
        "--title", input.title,
        "--body-file", "-",
        ...labels.flatMap((label) => ["--label", label]),
      ],
      { input: joinMetadataBlock(blockOf(provisional), input.body) },
    );
    const number = Number(out.trim().split("/").pop());
    if (!Number.isInteger(number) || number < 1) {
      throw new GhCommandError(["issue", "create"], `did not print the new issue URL: ${out.trim()}`);
    }
    const id = formatId(type, number);
    const frontmatter = input.frontmatter(id);
    const entity: StoredEntity = {
      type, id, bucket: "pending", frontmatter, body: input.body, path: out.trim(),
    };
    this.issues.set(entity, {
      number, title: input.title, body: "", labels: labels.map((name) => ({ name })),
      state: "OPEN", url: out.trim(),
    });
    return entity;
  }

  async save(
    entity: StoredEntity,
    frontmatter: Readonly<Record<string, unknown>>,
    body: string,
    to?: TaskBucket,
  ): Promise<StoredEntity> {
    const bucket = to ?? entity.bucket;
    const issue = await this.issueOf(entity);
    const diff = this.labelDiff(entity.type, issue, frontmatter, bucket);
    await this.ensureLabels(diff.add);

    // Title, body and the label swap go in one edit, so a reader never sees a half state.
    await this.gh(
      [
        "issue", "edit", String(issue.number), "--repo", this.repo,
        "--title", String(frontmatter["title"] ?? issue.title),
        "--body-file", "-",
        ...diff.add.flatMap((label) => ["--add-label", label]),
        ...diff.remove.flatMap((label) => ["--remove-label", label]),
      ],
      { input: joinMetadataBlock(blockOf(frontmatter), body) },
    );

    if (bucket === "complete" && issue.state !== "CLOSED") {
      const reason = frontmatter["status"] === "discarded" ? "not planned" : "completed";
      await this.gh(["issue", "close", String(issue.number), "--repo", this.repo, "--reason", reason]);
    } else if (bucket !== "complete" && issue.state === "CLOSED") {
      await this.gh(["issue", "reopen", String(issue.number), "--repo", this.repo]);
    }

    const saved: StoredEntity = { ...entity, bucket, frontmatter, body };
    const nextLabels = [...issue.labels.map((l) => l.name).filter((n) => !diff.remove.includes(n)), ...diff.add];
    this.issues.set(saved, {
      ...issue,
      title: String(frontmatter["title"] ?? issue.title),
      labels: nextLabels.map((name) => ({ name })),
      state: bucket === "complete" ? "CLOSED" : "OPEN",
    });
    return saved;
  }

  // Every flowstate issue of a type, in every state, with the entity it maps to or the
  // reason it does not. task-doctor reports the failures instead of tripping over them.
  async inspect(type: StoredType): Promise<InspectedIssue[]> {
    const issues = await this.listIssues(type, "all");
    return issues.map((issue) => {
      const labels = issue.labels.map((l) => l.name);
      try {
        return { type, number: issue.number, url: issue.url, labels, entity: this.toEntity(type, issue), error: undefined };
      } catch (err) {
        return { type, number: issue.number, url: issue.url, labels, entity: undefined, error: err instanceof Error ? err.message : String(err) };
      }
    });
  }

  // Labels drift when someone edits them on github.com; the metadata block and the issue
  // state stay the source of truth, so the labels are what gets realigned.
  async repairLabels(entity: StoredEntity, apply: boolean): Promise<LabelDiff> {
    const issue = await this.issueOf(entity);
    const diff = this.labelDiff(entity.type, issue, entity.frontmatter, entity.bucket);
    if (apply && (diff.add.length > 0 || diff.remove.length > 0)) {
      await this.ensureLabels(diff.add);
      await this.gh([
        "issue", "edit", String(issue.number), "--repo", this.repo,
        ...diff.add.flatMap((label) => ["--add-label", label]),
        ...diff.remove.flatMap((label) => ["--remove-label", label]),
      ]);
    }
    return diff;
  }

  private async fetchIssues(type: StoredType, buckets: readonly TaskBucket[]): Promise<GhIssue[]> {
    const wantOpen = buckets.some((bucket) => bucket !== "complete");
    const wantClosed = buckets.includes("complete");
    if (wantOpen && wantClosed) return this.listIssues(type, "all");
    if (wantOpen) return this.listIssues(type, "open");
    if (wantClosed) return this.listIssues(type, "closed");
    return [];
  }

  private async listIssues(type: StoredType, state: "open" | "closed" | "all"): Promise<GhIssue[]> {
    const args = [
      "issue", "list", "--repo", this.repo,
      "--label", TYPE_LABELS[type],
      "--state", state,
      "--limit", String(LIST_LIMIT),
      "--json", ISSUE_FIELDS,
    ];
    const issues = await ghJson<GhIssue[]>(this.gh, args);
    if (!Array.isArray(issues)) {
      throw new GhCommandError(args, "expected a JSON array");
    }
    if (issues.length >= LIST_LIMIT) {
      throw new GhCommandError(args, `returned ${issues.length} issues, the limit; the list would be truncated. Close or relabel old issues, or raise LIST_LIMIT.`);
    }
    return [...issues].sort((a, b) => a.number - b.number);
  }

  private async viewIssue(number: number): Promise<GhIssue | undefined> {
    try {
      return await ghJson<GhIssue>(this.gh, [
        "issue", "view", String(number), "--repo", this.repo, "--json", ISSUE_FIELDS,
      ]);
    } catch (err) {
      if (err instanceof GhCommandError && /could not resolve to an issue/i.test(err.message)) {
        return undefined;
      }
      throw err;
    }
  }

  private async issueOf(entity: StoredEntity): Promise<GhIssue> {
    const cached = this.issues.get(entity);
    if (cached) return cached;
    const number = issueNumberOf(entity.type, entity.id);
    const issue = number === undefined ? undefined : await this.viewIssue(number);
    if (!issue) {
      throw new GhIssueTypeError(number ?? 0, `${entity.id} no longer resolves to an issue in ${this.repo}`);
    }
    this.assertType(entity.type, issue);
    return issue;
  }

  private assertType(type: StoredType, issue: GhIssue): void {
    if (/\/pull\/\d+$/.test(issue.url)) {
      throw new GhIssueTypeError(issue.number, `#${issue.number} is a pull request, and flowstate IDs name issues only`);
    }
    const names = issue.labels.map((l) => l.name);
    if (!names.includes(TYPE_LABELS[type])) {
      const other = (Object.keys(TYPE_LABELS) as StoredType[]).find((t) => names.includes(TYPE_LABELS[t]));
      const detail = other
        ? `it is a flowstate ${other} (${formatId(other, issue.number)}), not a ${type}`
        : `it carries no "${TYPE_LABELS[type]}" label (labels: ${names.join(", ") || "none"})`;
      throw new GhIssueTypeError(issue.number, detail);
    }
  }

  private toEntity(type: StoredType, issue: GhIssue): StoredEntity {
    const labels = issue.labels.map((l) => l.name);
    const { metadata, body } = splitMetadataBlock(issue.body ?? "", issue.number);
    const id = formatId(type, issue.number);
    const block = blockOf(metadata);

    let frontmatter: Record<string, unknown>;
    let bucket: TaskBucket;
    if (type === "task") {
      bucket = issue.state === "CLOSED" ? "complete" : labels.includes(STATUS_LABELS.active) ? "active" : "pending";
      const priority = labels.find((name) => PRIORITY_LABELS.includes(name)) ?? "";
      const tags = labels.filter((name) => !isReservedLabel(name));
      frontmatter = { id, title: issue.title, status: taskStatusOf(bucket, block), priority, tags, ...block };
    } else {
      bucket = issue.state === "CLOSED" ? "complete" : "pending";
      const status = bucket === "complete" ? this.finalState(type, issue, labels) : "pending";
      frontmatter = { id, title: issue.title, status, ...block };
    }

    const entity: StoredEntity = { type, id, bucket, frontmatter, body, path: issue.url };
    this.issues.set(entity, issue);
    return entity;
  }

  private finalState(type: "idea" | "report", issue: GhIssue, labels: readonly string[]): string {
    const allowed = FINAL_STATE_LABELS[type];
    const found = Object.entries(allowed).filter(([, label]) => labels.includes(label));
    const stray = labels.filter((name) => name.startsWith("status:") && !Object.values(allowed).includes(name));
    if (found.length === 1 && stray.length === 0) return found[0]![0];
    const expected = Object.values(allowed).join(" or ");
    const detail =
      found.length === 0 && stray.length === 0
        ? `closed ${type} with no final-state label (expected exactly one of ${expected})`
        : `closed ${type} carries ${[...found.map(([, l]) => l), ...stray].join(", ")} (expected exactly one of ${expected})`;
    throw new GhIssueStateError(issue.number, detail);
  }

  private desiredLabels(
    type: StoredType,
    frontmatter: Readonly<Record<string, unknown>>,
    bucket: TaskBucket,
  ): string[] {
    const labels = [TYPE_LABELS[type]];
    if (type === "task") {
      const priority = String(frontmatter["priority"] ?? "");
      if (PRIORITY_LABELS.includes(priority)) labels.push(priority);
      if (bucket === "active") labels.push(STATUS_LABELS.active);
      if (taskStatusOf(bucket, frontmatter) === "blocked") labels.push(STATUS_LABELS.blocked);
      labels.push(...tagsOf(frontmatter).filter((tag) => !isReservedLabel(tag)));
    } else if (bucket === "complete") {
      const label = FINAL_STATE_LABELS[type][String(frontmatter["status"])];
      if (label === undefined) {
        throw new GhIssueStateError(
          Number(frontmatter["id"] !== undefined ? String(frontmatter["id"]).split("-")[1] : 0),
          `cannot close a ${type} with status "${String(frontmatter["status"])}" (expected ${Object.keys(FINAL_STATE_LABELS[type]).join(" or ")})`,
        );
      }
      labels.push(label);
    }
    return [...new Set(labels)];
  }

  // Tasks own every label on their issue (tags are labels), so a label not desired is
  // removed. Ideas and reports own only the reserved labels; a human's extra label stays.
  private labelDiff(
    type: StoredType,
    issue: GhIssue,
    frontmatter: Readonly<Record<string, unknown>>,
    bucket: TaskBucket,
  ): LabelDiff {
    const current = issue.labels.map((l) => l.name);
    const desired = this.desiredLabels(type, frontmatter, bucket);
    const owned = type === "task" ? current : current.filter(isReservedLabel);
    return {
      add: desired.filter((name) => !current.includes(name)),
      remove: owned.filter((name) => !desired.includes(name)),
    };
  }

  // Labels must exist before an issue can carry them. The repo's labels are listed once per
  // process; missing ones are created on first use. --force keeps the call idempotent.
  private async ensureLabels(names: readonly string[]): Promise<void> {
    if (names.length === 0) return;
    if (!this.existingLabels) {
      const listed = await ghJson<GhLabel[]>(this.gh, [
        "label", "list", "--repo", this.repo, "--limit", String(LIST_LIMIT), "--json", "name",
      ]);
      this.existingLabels = new Set(listed.map((l) => l.name));
    }
    for (const name of names) {
      if (this.existingLabels.has(name)) continue;
      const spec = FLOWSTATE_LABELS.find((l) => l.name === name);
      await this.gh([
        "label", "create", name, "--repo", this.repo, "--force",
        "--color", spec?.color ?? TAG_LABEL_COLOR,
        ...(spec ? ["--description", spec.description] : []),
      ]);
      this.existingLabels.add(name);
    }
  }
}
