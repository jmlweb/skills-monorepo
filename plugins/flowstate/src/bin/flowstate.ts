#!/usr/bin/env node

import { setup } from "../commands/setup.js";
import { nextId } from "../commands/next-id.js";
import { taskCreate } from "../commands/task-create.js";
import { taskList } from "../commands/task-list.js";
import { taskMove } from "../commands/task-move.js";
import { taskBlock } from "../commands/task-block.js";
import { taskUpdate, parseEvidence } from "../commands/task-update.js";
import { taskUnblock } from "../commands/task-unblock.js";
import { taskCondense, taskCondenseAll } from "../commands/task-condense.js";
import { taskCompress } from "../commands/task-compress.js";
import { taskNormalize } from "../commands/task-normalize.js";
import { taskDoctor } from "../commands/task-doctor.js";
import { stats } from "../commands/stats.js";
import { indexRebuild } from "../commands/index-rebuild.js";
import { ideaCreate } from "../commands/idea-create.js";
import { ideaList } from "../commands/idea-list.js";
import type { IdeaListStatus } from "../commands/idea-list.js";
import { ideaMove } from "../commands/idea-move.js";
import { reportCreate } from "../commands/report-create.js";
import { reportMove } from "../commands/report-move.js";
import { reportList } from "../commands/report-list.js";
import type { ReportListStatus } from "../commands/report-list.js";
import { learningCreate } from "../commands/learning-create.js";
import { learningSearch } from "../commands/learning-search.js";
import { learningList } from "../commands/learning-list.js";
import { learningMove } from "../commands/learning-move.js";
import { learningUpdate } from "../commands/learning-update.js";
import { learningCompress } from "../commands/learning-compress.js";
import type { EntityType, TaskStatus } from "../core/types.js";
import {
  validatePriority,
  validateComplexity,
  validateReportType,
  validateSeverity,
  validateIdeaDecision,
  validateReportDecision,
  validateTitle,
} from "../core/types.js";
import {
  BACKLOG_DIR_ENV,
  envSettingsSnippet,
  resolveBacklog,
  resolveSetupTarget,
  settingsSnippet,
} from "../core/paths.js";
import { InvalidArgumentError } from "../core/errors.js";
import { parseArgs, type ParsedArgs } from "../core/args.js";
import {
  BACKEND_ENV,
  GITHUB_REPO_ENV,
  resolveRepo,
  resolveStore,
  validateRepo,
} from "../core/backend.js";
import { createGhRunner } from "../core/gh.js";
import { GithubStore } from "../core/github-store.js";
import { setupGithub } from "../commands/setup-github.js";
import { taskDoctorGithub } from "../commands/task-doctor.js";
import {
  isSharedEnabled,
  registerBacklog,
  resolveSharedBacklogs,
  type LearningScope,
  type LearningSource,
} from "../core/registry.js";

const VALID_ENTITY_TYPES = new Set<EntityType>([
  "task",
  "idea",
  "report",
  "learning",
]);

const VALID_TASK_STATUSES = new Set<TaskStatus>([
  "pending",
  "active",
  "blocked",
  "complete",
]);

const TOP_LEVEL_HELP = `Usage: flowstate <command> [args]

Commands:
  setup              Initialize the backlog structure (.backlog, a custom/private dir, or --github)
  path               Print the resolved backlog directory (and the backend in use)
  next-id            Get next ID for an entity type
  task-create        Create a new task
  task-list          List tasks (optionally filter by status)
  task-move          Move task between statuses
  task-block         Block a task with a reason
  task-update        Update task fields, log progress, tick criteria
  task-unblock       Unblock a task
  task-condense      Condense a complete task (or --all)
  task-normalize     Merge duplicate Notes sections in a task
  task-compress      Replace a complete task body with a validated caveman-compressed version
  task-doctor        Reconcile task frontmatter status with folder location
  stats              Show backlog stats
  index-rebuild      Rebuild index files from disk
  idea-create        Create a new idea
  idea-list          List ideas (pending by default)
  idea-move          Approve or discard an idea
  report-create      Create a new report
  report-list        List reports (pending by default)
  report-move        Triage or discard a report
  learning-create    Create a new learning
  learning-search    Search learnings by tags/query
  learning-list      List learnings
  learning-move      Archive a learning
  learning-update    Update learning fields
  learning-compress  Replace a learning body with a validated caveman-compressed version

Global flags:
  --json true        Emit JSON to stdout
  --help, -h         Show help (top-level or per-command)

Run 'flowstate <command> --help' for command-specific usage.`;

const COMMAND_HELP: Record<string, string> = {
  setup:
    "Usage: flowstate setup [--project-name <name>] [--dir <path> | --private] [--github [--repo <owner/name>]]\n  --dir <path>  create the backlog at a custom directory (absolute, or relative to the project root) and print the .claude/settings.local.json snippet that points flowstate at it\n  --private     shorthand for --dir <common-git-dir>/flowstate (untracked, shared across worktrees)\n  --github      keep tasks, ideas and reports in GitHub Issues: verifies gh auth and the repo (--repo, else FLOWSTATE_GITHUB_REPO, else the checkout's remote), creates the flowstate labels, creates only learnings/ on disk and prints the settings snippet that sets FLOWSTATE_BACKEND=github\n  Runtime resolution: FLOWSTATE_BACKLOG_DIR if set (absolute; a relative value resolves against the project root), else the nearest .backlog/ walking up from cwd. FLOWSTATE_BACKEND=github selects the GitHub backend; anything else selects the files.",
  path:
    'Usage: flowstate path [--json true]\n  Prints the resolved backlog directory (learnings only in GitHub mode). With --json true: {"path": ..., "source": "env"|"walk-up", "backend": "file"|"github", "repo": "owner/name" (GitHub mode only)}.',
  "next-id":
    "Usage: flowstate next-id <task|idea|report|learning>\n  In GitHub mode only learning is available: task, idea and report IDs are issue numbers assigned on creation.",
  "task-create":
    "Usage: flowstate task-create --title <text> --priority <P1|P2|P3|P4> [--tags t1,t2] [--description <text> | --body <text|->] [--criteria <json-array>] [--source <ref>] [--depends-on id1,id2]",
  "task-list":
    "Usage: flowstate task-list [--status <pending|active|blocked|complete>] [--limit <n>]",
  "task-move":
    "Usage: flowstate task-move <id> --to <active|complete|pending>",
  "task-block":
    "Usage: flowstate task-block <id> --reason <text>",
  "task-update":
    "Usage: flowstate task-update <id> [--set key=value ...] [--log <message|->] [--check <n[,n...]>] [--evidence <json>]\n  --log -      read the message from stdin; each non-empty line becomes a dated Progress Log bullet\n  --check 1,3  tick acceptance criteria by 1-based index (already ticked: no-op)\n  --evidence '{\"2\":\"pnpm test → exit 0\"}'  attach proof to criteria ticked in the same call; keys must be in --check",
  "task-unblock":
    "Usage: flowstate task-unblock <id> [--resolution <text>]",
  "task-condense":
    "Usage: flowstate task-condense <id> | flowstate task-condense --all\n  Trims Notes section and middle Progress Log entries from complete tasks. Idempotent (sets condensed: true).",
  "task-normalize":
    "Usage: flowstate task-normalize <id>\n  Merges repeated ## Notes sections of a task (any status) into the first one. Idempotent.",
  "task-compress":
    "Usage: flowstate task-compress <id> --body -\n  Replace task body with caveman-compressed version piped on stdin. Validates that all code blocks, inline code, URLs, IDs, dates, version numbers, and headings are preserved, and that the Acceptance Criteria section is byte-exact. Rejects on invariant failure with JSON diagnostics. Sets compressed: true on success. Idempotent.",
  "task-doctor":
    "Usage: flowstate task-doctor [--dry-run true]\n  Reconciles frontmatter `status` field with folder location for every task in tasks/{pending,active,complete}/. Maps synonyms (done, completed, todo, wip, ...) to canonical values. Idempotent.\n  GitHub mode: realigns status and priority labels with each issue's state and metadata block, and lists closed ideas or reports whose final-state labels are missing, duplicated or unknown (`invalid`).",
  stats:
    "Usage: flowstate stats\n  Counts tasks, ideas and reports through the active backend (files or GitHub Issues); learnings always come from the backlog directory.",
  "index-rebuild":
    "Usage: flowstate index-rebuild [--type <tasks|learnings|all>]\n  GitHub mode has no tasks/index.md: --type tasks reports it as not applicable, and all rebuilds learnings only.",
  "idea-create":
    "Usage: flowstate idea-create --title <text> --complexity <low|medium|high> [--body <text|->]",
  "idea-list":
    "Usage: flowstate idea-list [--status <pending|complete|all>] [--limit <n>]\n  Default: pending only.",
  "idea-move":
    "Usage: flowstate idea-move <id> --status <approved|discarded> [--task-id <id>]",
  "report-create":
    "Usage: flowstate report-create --title <text> --type <bug|finding|improvement|security> --severity <low|medium|high|critical> [--body <text|->]",
  "report-list":
    "Usage: flowstate report-list [--status <pending|complete|all>] [--limit <n>]\n  Default: pending only.",
  "report-move":
    "Usage: flowstate report-move <id> --status <triaged|discarded> [--task-id <id>]",
  "learning-create":
    "Usage: flowstate learning-create --title <text> [--tags t1,t2] [--task <id>] [--body <text|->]",
  "learning-search":
    "Usage: flowstate learning-search [--tags t1,t2] [--query <text> | --similar-to <title>] [--limit <n>] [--body true] [--scope <local|all>]\n  --similar-to is an alias for --query, intended for dedupe / similarity checks before creating a learning.\n  --scope all (default) also reads active learnings from registered sibling backlogs; local reads only this one. Results carry a source column: local, or the owning project's name.",
  "learning-list":
    "Usage: flowstate learning-list [--status <active|archived|superseded|all>] [--include-archived true] [--all true] [--scope <local|all>]\n  Default: active only. --include-archived and --all are aliases for --status all. --scope defaults to all, as learning-search does.",
  "learning-move":
    "Usage: flowstate learning-move <id> --to archived",
  "learning-update":
    "Usage: flowstate learning-update <id> [--title <text>] [--tags t1,t2] [--body <text|->]",
  "learning-compress":
    "Usage: flowstate learning-compress <id> --body -\n  Replace learning body with caveman-compressed version piped on stdin. Validates that all code blocks, inline code, URLs, IDs, dates, version numbers, and headings are preserved. Rejects on invariant failure with JSON diagnostics. Sets compressed: true on success. Idempotent.",
};

function wantsHelp(args: readonly string[]): boolean {
  return args.includes("--help") || args.includes("-h");
}

function asEntityType(value: string): EntityType {
  if (!VALID_ENTITY_TYPES.has(value as EntityType)) {
    throw new InvalidArgumentError(
      `Invalid entity type: "${value}". Expected: task, idea, report, learning`,
    );
  }
  return value as EntityType;
}

function asTaskStatus(value: string): TaskStatus {
  if (!VALID_TASK_STATUSES.has(value as TaskStatus)) {
    throw new InvalidArgumentError(
      `Invalid status: "${value}". Expected: pending, active, blocked, complete`,
    );
  }
  return value as TaskStatus;
}

// Flags that may appear without a value; every other flag needs one.
const SWITCHES: ReadonlySet<string> = new Set([
  "json",
  "private",
  "github",
  "dry-run",
  "all",
  "include-archived",
]);

function parseArgsOrExit(args: readonly string[]): ParsedArgs {
  try {
    return parseArgs(args, SWITCHES);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// Registration is best-effort: a failed write must never fail the command that triggered it.
async function registerForSharing(root: string): Promise<void> {
  if (!isSharedEnabled()) return;
  try {
    await registerBacklog(root);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`warning: backlog not registered for shared learnings: ${reason}`);
  }
}

function parseScope(value: string | undefined): LearningScope {
  if (value === undefined || value === "all") return "all";
  if (value === "local") return "local";
  throw new InvalidArgumentError(`Invalid --scope value: "${value}". Must be one of: local, all`);
}

// Skips go to stderr so stdout stays a bare JSON array for every caller.
async function sharedForScope(
  root: string,
  scope: LearningScope,
): Promise<readonly LearningSource[]> {
  if (scope === "local" || !isSharedEnabled()) return [];
  const { sources, skipped } = await resolveSharedBacklogs(root);
  for (const { path, reason } of skipped) {
    console.error(`warning: shared backlog ${path} skipped (${reason})`);
  }
  return sources;
}

function required(flags: Record<string, string>, key: string): string {
  const val = flags[key];
  if (val === undefined) {
    console.error(`Missing required flag: --${key}`);
    process.exit(1);
  }
  if (val.trim() === "") {
    throw new InvalidArgumentError(`Flag --${key} cannot be empty or whitespace-only.`);
  }
  return val;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function parseCriteriaIndexes(value: string | undefined): number[] {
  if (value === undefined) return [];
  return value.split(",").map((part) => {
    const trimmed = part.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new InvalidArgumentError(
        `Invalid --check value "${value}". Use comma-separated 1-based criterion numbers, e.g. --check 1,3.`,
      );
    }
    return Number(trimmed);
  });
}

function parseLimit(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    throw new InvalidArgumentError(
      `Invalid --limit value: "${value}". Use a positive integer, e.g. --limit 5.`,
    );
  }
  return Number(value);
}

function parseIndexType(value: string | undefined): "tasks" | "learnings" | "all" {
  if (value === undefined || value === "all") return "all";
  if (value === "tasks" || value === "learnings") return value;
  throw new InvalidArgumentError(`Invalid --type value: "${value}". Must be one of: tasks, learnings, all`);
}

function parseCriteria(value: string | undefined): string[] {
  if (value === undefined) return [];
  const usage = `Invalid --criteria value. Use a JSON array of non-empty strings, e.g. --criteria '["Tests pass","Docs updated"]'.`;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new InvalidArgumentError(usage);
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.every((item): item is string => typeof item === "string" && item.trim() !== "")
  ) {
    throw new InvalidArgumentError(usage);
  }
  return parsed;
}

async function getBody(flags: Record<string, string>): Promise<string> {
  const body = flags["body"];
  if (body === "-") return readStdin();
  return body ?? "";
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  if (!command) {
    console.error(TOP_LEVEL_HELP);
    process.exit(1);
  }

  if (command === "--help" || command === "-h" || command === "help") {
    console.log(TOP_LEVEL_HELP);
    process.exit(0);
  }

  if (wantsHelp(rest)) {
    const usage = COMMAND_HELP[command];
    if (usage) {
      console.log(usage);
      process.exit(0);
    }
    console.error(`Unknown command: ${command}\n\n${TOP_LEVEL_HELP}`);
    process.exit(1);
  }

  const { flags, flagArrays, positional } = parseArgsOrExit(rest);
  const json = flags["json"] === "true";
  try {
    // Resolved once here; commands only ever see the final backlog directory.
    if (command === "setup") {
      const name = flags["project-name"] ?? "Project";
      const target = resolveSetupTarget(process.cwd(), {
        ...(flags["dir"] !== undefined ? { dir: flags["dir"] } : {}),
        isPrivate: flags["private"] === "true",
      });
      if (flags["github"] === "true") {
        const gh = createGhRunner({ cwd: process.cwd() });
        const repo =
          flags["repo"] !== undefined ? validateRepo(flags["repo"]) : await resolveRepo(gh);
        const result = await setupGithub(target.dir, { repo, projectName: name }, gh);
        await registerForSharing(result.root);
        output(
          {
            ...result,
            backend: "github",
            settingsFile: ".claude/settings.local.json",
            settingsSnippet: envSettingsSnippet({
              [BACKEND_ENV]: "github",
              ...(flags["repo"] !== undefined ? { [GITHUB_REPO_ENV]: repo } : {}),
              ...(target.isCustom ? { [BACKLOG_DIR_ENV]: result.root } : {}),
            }),
          },
          json,
        );
        return;
      }
      if (flags["repo"] !== undefined) {
        throw new InvalidArgumentError("--repo only applies with --github.");
      }
      const created = await setup(target.dir, name);
      await registerForSharing(created);
      output(
        target.isCustom
          ? {
              root: created,
              settingsFile: ".claude/settings.local.json",
              settingsSnippet: settingsSnippet(created),
            }
          : { root: created },
        json,
      );
      return;
    }

    const resolved = resolveBacklog(process.cwd());
    const root = resolved.dir;
    // Learnings and index-rebuild still read the directory directly, in every mode.
    const { backend, store, repo } = await resolveStore(root, process.cwd());
    await registerForSharing(root);

    switch (command) {
      case "path": {
        if (json) {
          output(
            { path: root, source: resolved.source, backend, ...(repo !== undefined ? { repo } : {}) },
            true,
          );
        } else {
          console.log(root);
        }
        break;
      }

      case "next-id": {
        const raw = positional[0];
        if (!raw) {
          console.error("Usage: flowstate next-id <task|idea|report|learning>");
          process.exit(1);
        }
        const type = asEntityType(raw);
        if (backend === "github" && type !== "learning") {
          throw new InvalidArgumentError(
            `next-id ${type} is not available in GitHub mode: the ID is the issue number, assigned by ${type}-create.`,
          );
        }
        const id = await nextId(root, type);
        output({ id }, json);
        break;
      }

      case "task-create": {
        const body = await getBody(flags);
        const result = await taskCreate(store, {
          title: validateTitle(required(flags, "title")),
          priority: validatePriority(required(flags, "priority")),
          tags: flags["tags"] ? flags["tags"].split(",").map((t) => t.trim()) : [],
          description: body || flags["description"] || "",
          criteria: parseCriteria(flags["criteria"]),
          source: flags["source"] ?? "manual",
          dependsOn: flags["depends-on"]
            ? flags["depends-on"].split(",").map((t) => t.trim())
            : [],
        });
        output(result, json);
        break;
      }

      case "task-list": {
        const status = flags["status"] ? asTaskStatus(flags["status"]) : undefined;
        const limit = parseLimit(flags["limit"]);
        const items = await taskList(store, status, limit);
        output(items, json);
        break;
      }

      case "task-move": {
        const id = positional[0];
        if (!id) {
          console.error("Usage: flowstate task-move <id> --to <active|complete|pending>");
          process.exit(1);
        }
        const toRaw = required(flags, "to");
        const VALID_TO = ["active", "complete", "pending"] as const;
        if (!VALID_TO.includes(toRaw as (typeof VALID_TO)[number])) {
          console.error(`Invalid --to value: "${toRaw}". Must be one of: ${VALID_TO.join(", ")}`);
          process.exit(1);
        }
        const to = toRaw as "active" | "complete" | "pending";
        const result = await taskMove(store, id, to);
        if (json) {
          output(result, true);
        } else {
          console.log(`path: ${result.path}`);
          if (result.unverifiedCriteria && result.unverifiedCriteria.length > 0) {
            console.log(
              `warning: ticked criteria without evidence: ${result.unverifiedCriteria.join(",")}`,
            );
          }
        }
        break;
      }

      case "task-block": {
        const id = positional[0];
        if (!id) {
          console.error("Usage: flowstate task-block <id> --reason <text>");
          process.exit(1);
        }
        const result = await taskBlock(store, id, required(flags, "reason"));
        output(result, json);
        break;
      }

      case "task-update": {
        const id = positional[0];
        if (!id) {
          console.error("Usage: flowstate task-update <id> [--set key=value] [--log msg|-] [--check n,...] [--evidence json]");
          process.exit(1);
        }
        const updates: Record<string, string> = {};
        const sets = flagArrays["set"] ?? [];
        for (const pair of sets) {
          const eqIdx = pair.indexOf("=");
          if (eqIdx !== -1) {
            updates[pair.slice(0, eqIdx).trim()] = pair.slice(eqIdx + 1).trim();
          }
        }
        const log = flags["log"] === "-" ? await readStdin() : flags["log"];
        const checkCriteria = parseCriteriaIndexes(flags["check"]);
        const result = await taskUpdate(
          store,
          id,
          updates,
          log,
          checkCriteria,
          parseEvidence(flags["evidence"]),
        );
        output(result, json);
        break;
      }

      case "task-unblock": {
        const id = positional[0];
        if (!id) {
          console.error("Usage: flowstate task-unblock <id> [--resolution text]");
          process.exit(1);
        }
        const result = await taskUnblock(store, id, flags["resolution"]);
        output(result, json);
        break;
      }

      case "task-condense": {
        if (flags["all"] === "true") {
          const results = await taskCondenseAll(store);
          output(results, json);
        } else {
          const id = positional[0];
          if (!id) {
            console.error("Usage: flowstate task-condense <id> | flowstate task-condense --all");
            process.exit(1);
          }
          const result = await taskCondense(store, id);
          output(result, json);
        }
        break;
      }

      case "task-normalize": {
        const id = positional[0];
        if (!id) {
          console.error("Usage: flowstate task-normalize <id>");
          process.exit(1);
        }
        const result = await taskNormalize(store, id);
        output(result, json);
        break;
      }

      case "task-compress": {
        const id = positional[0];
        if (!id) {
          console.error("Usage: flowstate task-compress <id> --body -");
          process.exit(1);
        }
        const body = await getBody(flags);
        if (!body) {
          console.error("Missing --body (use --body - to read from stdin)");
          process.exit(1);
        }
        const result = await taskCompress(store, id, body);
        output(result, json);
        if (!result.ok && !result.skippedReason) process.exit(2);
        break;
      }

      case "task-doctor": {
        const dryRun = flags["dry-run"] === "true";
        const result =
          store instanceof GithubStore
            ? await taskDoctorGithub(store, { dryRun })
            : await taskDoctor(root, { dryRun });
        output(result, json);
        break;
      }

      case "stats": {
        const result = await stats(store, root);
        output(result, json);
        break;
      }

      case "index-rebuild": {
        const type = parseIndexType(flags["type"]);
        if (backend === "github" && type !== "learnings") {
          // Tasks have no index.md in GitHub mode; say so instead of a silent no-op.
          const skipped = "tasks: not applicable in GitHub mode (issues have no index.md)";
          if (type === "tasks") {
            output({ rebuilt: "none", skipped }, json);
            break;
          }
          await indexRebuild(root, "learnings");
          output({ rebuilt: "learnings", skipped }, json);
          break;
        }
        await indexRebuild(root, type);
        output({ rebuilt: type }, json);
        break;
      }

      case "idea-create": {
        const body = await getBody(flags);
        const result = await ideaCreate(store, {
          title: validateTitle(required(flags, "title")),
          complexity: validateComplexity(required(flags, "complexity")),
          body,
        });
        output(result, json);
        break;
      }

      case "idea-list": {
        const VALID_IDEA_STATUS = ["pending", "complete", "all"] as const;
        const statusRaw = flags["status"];
        let status: IdeaListStatus | undefined;
        if (statusRaw !== undefined) {
          if (!VALID_IDEA_STATUS.includes(statusRaw as IdeaListStatus)) {
            console.error(
              `Invalid --status value: "${statusRaw}". Must be one of: ${VALID_IDEA_STATUS.join(", ")}`,
            );
            process.exit(1);
          }
          status = statusRaw as IdeaListStatus;
        }
        const limit = parseLimit(flags["limit"]);
        const result = await ideaList(store, {
          ...(status !== undefined ? { status } : {}),
          ...(limit !== undefined ? { limit } : {}),
        });
        output(result, json);
        break;
      }

      case "idea-move": {
        const id = positional[0];
        if (!id) {
          console.error("Usage: flowstate idea-move <id> --status <approved|discarded>");
          process.exit(1);
        }
        const result = await ideaMove(
          store,
          id,
          validateIdeaDecision(required(flags, "status")),
          flags["task-id"],
        );
        output(result, json);
        break;
      }

      case "report-create": {
        const body = await getBody(flags);
        const result = await reportCreate(store, {
          title: validateTitle(required(flags, "title")),
          type: validateReportType(required(flags, "type")),
          severity: validateSeverity(required(flags, "severity")),
          body,
        });
        output(result, json);
        break;
      }

      case "report-list": {
        const VALID_REPORT_STATUS = ["pending", "complete", "all"] as const;
        const statusRaw = flags["status"];
        let status: ReportListStatus | undefined;
        if (statusRaw !== undefined) {
          if (!VALID_REPORT_STATUS.includes(statusRaw as ReportListStatus)) {
            console.error(
              `Invalid --status value: "${statusRaw}". Must be one of: ${VALID_REPORT_STATUS.join(", ")}`,
            );
            process.exit(1);
          }
          status = statusRaw as ReportListStatus;
        }
        const limit = parseLimit(flags["limit"]);
        const result = await reportList(store, {
          ...(status !== undefined ? { status } : {}),
          ...(limit !== undefined ? { limit } : {}),
        });
        output(result, json);
        break;
      }

      case "report-move": {
        const id = positional[0];
        if (!id) {
          console.error("Usage: flowstate report-move <id> --status <triaged|discarded>");
          process.exit(1);
        }
        const result = await reportMove(
          store,
          id,
          validateReportDecision(required(flags, "status")),
          flags["task-id"],
        );
        output(result, json);
        break;
      }

      case "learning-create": {
        const body = await getBody(flags);
        const result = await learningCreate(root, {
          title: validateTitle(required(flags, "title")),
          tags: flags["tags"] ? flags["tags"].split(",").map((t) => t.trim()) : [],
          body,
          task: flags["task"],
        });
        output(result, json);
        break;
      }

      case "learning-search": {
        const query = flags["query"] ?? flags["similar-to"];
        const scope = parseScope(flags["scope"]);
        const result = await learningSearch(root, {
          tags: flags["tags"] ? flags["tags"].split(",").map((t) => t.trim()) : undefined,
          query,
          limit: parseLimit(flags["limit"]),
          includeBody: flags["body"] === "true",
          scope,
          shared: await sharedForScope(root, scope),
        });
        output(result, json);
        break;
      }

      case "learning-list": {
        const VALID_STATUS_FILTER = ["active", "archived", "superseded", "all"] as const;
        type StatusFilter = (typeof VALID_STATUS_FILTER)[number];
        const includeArchived = flags["include-archived"] === "true";
        const allFlag = flags["all"] === "true";
        const statusRaw = flags["status"];
        let status: StatusFilter | undefined;
        if (statusRaw !== undefined) {
          if (!VALID_STATUS_FILTER.includes(statusRaw as StatusFilter)) {
            console.error(
              `Invalid --status value: "${statusRaw}". Must be one of: ${VALID_STATUS_FILTER.join(", ")}`,
            );
            process.exit(1);
          }
          status = statusRaw as StatusFilter;
        } else if (includeArchived || allFlag) {
          status = "all";
        }
        const scope = parseScope(flags["scope"]);
        const result = await learningList(root, {
          ...(status !== undefined ? { status } : {}),
          scope,
          shared: await sharedForScope(root, scope),
        });
        output(result, json);
        break;
      }

      case "learning-move": {
        const id = positional[0];
        if (!id) {
          console.error("Usage: flowstate learning-move <id> --to archived");
          process.exit(1);
        }
        const toRaw = required(flags, "to");
        if (toRaw !== "archived") {
          console.error(`Invalid --to value: "${toRaw}". Must be: archived`);
          process.exit(1);
        }
        const result = await learningMove(root, id, "archived");
        output(result, json);
        break;
      }

      case "learning-update": {
        const id = positional[0];
        if (!id) {
          console.error("Usage: flowstate learning-update <id> [--title <text>] [--tags <t1,t2>] [--body <text|-]");
          process.exit(1);
        }
        const body = flags["body"] ? await getBody(flags) : undefined;
        const updateInput: import("../commands/learning-update.js").LearningUpdateInput = {
          ...(flags["title"] !== undefined ? { title: validateTitle(flags["title"]) } : {}),
          ...(flags["tags"] !== undefined ? { tags: flags["tags"].split(",").map((t) => t.trim()) } : {}),
          ...(body !== undefined ? { body } : {}),
        };
        const result = await learningUpdate(root, id, updateInput);
        output(result, json);
        break;
      }

      case "learning-compress": {
        const id = positional[0];
        if (!id) {
          console.error("Usage: flowstate learning-compress <id> --body -");
          process.exit(1);
        }
        const body = await getBody(flags);
        if (!body) {
          console.error("Missing --body (use --body - to read from stdin)");
          process.exit(1);
        }
        const result = await learningCompress(root, id, body);
        output(result, json);
        if (!result.ok && !result.skippedReason) process.exit(2);
        break;
      }

      default:
        console.error(`Unknown command: ${command}\n\nRun 'flowstate --help' for available commands.`);
        process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (json) {
      console.error(JSON.stringify({ error: message }));
    } else {
      console.error(`Error: ${message}`);
    }
    process.exit(1);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Plain rows are one line per entity; escape characters that would split a row or column.
// A nested object has no row shape of its own, so it prints as JSON rather than [object Object].
function toPlainCell(value: unknown): string {
  const text = isRecord(value) ? JSON.stringify(value) : String(value);
  return text.replace(/\r?\n|\r/g, "\\n").replace(/\t/g, "\\t");
}

function printRows(items: readonly unknown[]): void {
  for (const item of items) {
    if (!isRecord(item)) continue;
    console.log(
      Object.values(item)
        .filter((v) => v !== undefined)
        .map(toPlainCell)
        .join("\t"),
    );
  }
}

function output(data: unknown, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (Array.isArray(data)) {
    printRows(data);
  } else if (isRecord(data)) {
    for (const [key, value] of Object.entries(data)) {
      // A list of objects under a key (task-doctor's fixed) gets one row per item.
      if (Array.isArray(value) && value.some(isRecord)) {
        console.log(`${key}:`);
        printRows(value);
      } else {
        console.log(`${key}: ${isRecord(value) ? JSON.stringify(value) : value}`);
      }
    }
  } else {
    console.log(data);
  }
}

main();
