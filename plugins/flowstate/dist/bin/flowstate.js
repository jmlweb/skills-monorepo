#!/usr/bin/env node
import { setup } from "../commands/setup.js";
import { nextId } from "../commands/next-id.js";
import { taskCreate } from "../commands/task-create.js";
import { taskList } from "../commands/task-list.js";
import { taskMove } from "../commands/task-move.js";
import { taskBlock } from "../commands/task-block.js";
import { taskUpdate } from "../commands/task-update.js";
import { taskUnblock } from "../commands/task-unblock.js";
import { taskCondense, taskCondenseAll } from "../commands/task-condense.js";
import { taskCompress } from "../commands/task-compress.js";
import { taskDoctor } from "../commands/task-doctor.js";
import { stats } from "../commands/stats.js";
import { indexRebuild } from "../commands/index-rebuild.js";
import { ideaCreate } from "../commands/idea-create.js";
import { ideaList } from "../commands/idea-list.js";
import { ideaMove } from "../commands/idea-move.js";
import { reportCreate } from "../commands/report-create.js";
import { reportMove } from "../commands/report-move.js";
import { learningCreate } from "../commands/learning-create.js";
import { learningSearch } from "../commands/learning-search.js";
import { learningList } from "../commands/learning-list.js";
import { learningMove } from "../commands/learning-move.js";
import { learningUpdate } from "../commands/learning-update.js";
import { learningCompress } from "../commands/learning-compress.js";
import { validatePriority, validateComplexity, validateReportType, validateSeverity } from "../core/types.js";
import { findBacklogRoot } from "../core/paths.js";
import { InvalidArgumentError } from "../core/errors.js";
const VALID_ENTITY_TYPES = new Set([
    "task",
    "idea",
    "report",
    "learning",
]);
const VALID_TASK_STATUSES = new Set([
    "pending",
    "active",
    "blocked",
    "complete",
]);
const TOP_LEVEL_HELP = `Usage: flowstate <command> [args]

Commands:
  setup              Initialize .backlog structure
  next-id            Get next ID for an entity type
  task-create        Create a new task
  task-list          List tasks (optionally filter by status)
  task-move          Move task between statuses
  task-block         Block a task with a reason
  task-update        Update task fields and append progress log
  task-unblock       Unblock a task
  task-condense      Condense a complete task (or --all)
  task-compress      Replace a complete task body with a validated caveman-compressed version
  task-doctor        Reconcile task frontmatter status with folder location
  stats              Show backlog stats
  index-rebuild      Rebuild index files from disk
  idea-create        Create a new idea
  idea-list          List ideas (pending by default)
  idea-move          Approve or discard an idea
  report-create      Create a new report
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
const COMMAND_HELP = {
    setup: "Usage: flowstate setup [--project-name <name>]",
    "next-id": "Usage: flowstate next-id <task|idea|report|learning>",
    "task-create": "Usage: flowstate task-create --title <text> --priority <P0|P1|P2|P3> [--tags t1,t2] [--description <text> | --body <text|->] [--criteria <json-array>] [--source <ref>] [--depends-on id1,id2]",
    "task-list": "Usage: flowstate task-list [--status <pending|active|blocked|complete>] [--limit <n>]",
    "task-move": "Usage: flowstate task-move <id> --to <active|complete|pending>",
    "task-block": "Usage: flowstate task-block <id> --reason <text>",
    "task-update": "Usage: flowstate task-update <id> [--set key=value ...] [--log <message>]",
    "task-unblock": "Usage: flowstate task-unblock <id> [--resolution <text>]",
    "task-condense": "Usage: flowstate task-condense <id> | flowstate task-condense --all\n  Trims Notes section and middle Progress Log entries from complete tasks. Idempotent (sets condensed: true).",
    "task-compress": "Usage: flowstate task-compress <id> --body -\n  Replace task body with caveman-compressed version piped on stdin. Validates that all code blocks, inline code, URLs, IDs, dates, version numbers, and headings are preserved, and that the Acceptance Criteria section is byte-exact. Rejects on invariant failure with JSON diagnostics. Sets compressed: true on success. Idempotent.",
    "task-doctor": "Usage: flowstate task-doctor [--dry-run true]\n  Reconciles frontmatter `status` field with folder location for every task in tasks/{pending,active,complete}/. Maps synonyms (done, completed, todo, wip, ...) to canonical values. Idempotent.",
    stats: "Usage: flowstate stats",
    "index-rebuild": "Usage: flowstate index-rebuild [--type <tasks|learnings|all>]",
    "idea-create": "Usage: flowstate idea-create --title <text> --complexity <low|medium|high> [--body <text|->]",
    "idea-list": "Usage: flowstate idea-list [--status <pending|complete|all>] [--limit <n>]\n  Default: pending only.",
    "idea-move": "Usage: flowstate idea-move <id> --status <approved|discarded> [--task-id <id>]",
    "report-create": "Usage: flowstate report-create --title <text> --type <bug|finding|security> --severity <low|medium|high|critical> [--body <text|->]",
    "report-move": "Usage: flowstate report-move <id> --status <triaged|discarded> [--task-id <id>]",
    "learning-create": "Usage: flowstate learning-create --title <text> [--tags t1,t2] [--task <id>] [--body <text|->]",
    "learning-search": "Usage: flowstate learning-search [--tags t1,t2] [--query <text> | --similar-to <title>] [--limit <n>] [--body true]\n  --similar-to is an alias for --query, intended for dedupe / similarity checks before creating a learning.",
    "learning-list": "Usage: flowstate learning-list [--status <active|archived|superseded|all>] [--include-archived true] [--all true]\n  Default: active only. --include-archived and --all are aliases for --status all.",
    "learning-move": "Usage: flowstate learning-move <id> --to archived",
    "learning-update": "Usage: flowstate learning-update <id> [--title <text>] [--tags t1,t2] [--body <text|->]",
    "learning-compress": "Usage: flowstate learning-compress <id> --body -\n  Replace learning body with caveman-compressed version piped on stdin. Validates that all code blocks, inline code, URLs, IDs, dates, version numbers, and headings are preserved. Rejects on invariant failure with JSON diagnostics. Sets compressed: true on success. Idempotent.",
};
function wantsHelp(args) {
    return args.includes("--help") || args.includes("-h");
}
function asEntityType(value) {
    if (!VALID_ENTITY_TYPES.has(value)) {
        throw new InvalidArgumentError(`Invalid entity type: "${value}". Expected: task, idea, report, learning`);
    }
    return value;
}
function asTaskStatus(value) {
    if (!VALID_TASK_STATUSES.has(value)) {
        throw new InvalidArgumentError(`Invalid status: "${value}". Expected: pending, active, blocked, complete`);
    }
    return value;
}
function parseArgs(args) {
    const flags = {};
    const flagArrays = {};
    const positional = [];
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith("--")) {
            const key = arg.slice(2);
            const next = args[i + 1];
            if (next && !next.startsWith("--")) {
                flags[key] = next;
                (flagArrays[key] ??= []).push(next);
                i++;
            }
            else {
                flags[key] = "true";
                (flagArrays[key] ??= []).push("true");
            }
        }
        else {
            positional.push(arg);
        }
    }
    return { flags, flagArrays, positional };
}
function required(flags, key) {
    const val = flags[key];
    if (!val) {
        console.error(`Missing required flag: --${key}`);
        process.exit(1);
    }
    return val;
}
async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf-8");
}
async function getBody(flags) {
    const body = flags["body"];
    if (body === "-")
        return readStdin();
    return body ?? "";
}
async function main() {
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
    const { flags, flagArrays, positional } = parseArgs(rest);
    const json = flags["json"] === "true";
    const cwd = command === "setup"
        ? process.cwd()
        : findBacklogRoot(process.cwd());
    try {
        switch (command) {
            case "setup": {
                const name = flags["project-name"] ?? "Project";
                const root = await setup(cwd, name);
                output({ root }, json);
                break;
            }
            case "next-id": {
                const raw = positional[0];
                if (!raw) {
                    console.error("Usage: flowstate next-id <task|idea|report|learning>");
                    process.exit(1);
                }
                const id = await nextId(cwd, asEntityType(raw));
                output({ id }, json);
                break;
            }
            case "task-create": {
                const body = await getBody(flags);
                const result = await taskCreate(cwd, {
                    title: required(flags, "title"),
                    priority: validatePriority(required(flags, "priority")),
                    tags: flags["tags"] ? flags["tags"].split(",").map((t) => t.trim()) : [],
                    description: body || flags["description"] || "",
                    criteria: flags["criteria"] ? JSON.parse(flags["criteria"]) : [],
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
                const limit = flags["limit"] ? parseInt(flags["limit"], 10) : undefined;
                const items = await taskList(cwd, status, limit);
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
                const VALID_TO = ["active", "complete", "pending"];
                if (!VALID_TO.includes(toRaw)) {
                    console.error(`Invalid --to value: "${toRaw}". Must be one of: ${VALID_TO.join(", ")}`);
                    process.exit(1);
                }
                const to = toRaw;
                const result = await taskMove(cwd, id, to);
                output(result, json);
                break;
            }
            case "task-block": {
                const id = positional[0];
                if (!id) {
                    console.error("Usage: flowstate task-block <id> --reason <text>");
                    process.exit(1);
                }
                const result = await taskBlock(cwd, id, required(flags, "reason"));
                output(result, json);
                break;
            }
            case "task-update": {
                const id = positional[0];
                if (!id) {
                    console.error("Usage: flowstate task-update <id> --set key=value [--log msg]");
                    process.exit(1);
                }
                const updates = {};
                const sets = flagArrays["set"] ?? [];
                for (const pair of sets) {
                    const eqIdx = pair.indexOf("=");
                    if (eqIdx !== -1) {
                        updates[pair.slice(0, eqIdx).trim()] = pair.slice(eqIdx + 1).trim();
                    }
                }
                const result = await taskUpdate(cwd, id, updates, flags["log"]);
                output(result, json);
                break;
            }
            case "task-unblock": {
                const id = positional[0];
                if (!id) {
                    console.error("Usage: flowstate task-unblock <id> [--resolution text]");
                    process.exit(1);
                }
                const result = await taskUnblock(cwd, id, flags["resolution"]);
                output(result, json);
                break;
            }
            case "task-condense": {
                if (flags["all"] === "true") {
                    const results = await taskCondenseAll(cwd);
                    output(results, json);
                }
                else {
                    const id = positional[0];
                    if (!id) {
                        console.error("Usage: flowstate task-condense <id> | flowstate task-condense --all");
                        process.exit(1);
                    }
                    const result = await taskCondense(cwd, id);
                    output(result, json);
                }
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
                const result = await taskCompress(cwd, id, body);
                output(result, json);
                if (!result.ok && !result.skippedReason)
                    process.exit(2);
                break;
            }
            case "task-doctor": {
                const result = await taskDoctor(cwd, {
                    dryRun: flags["dry-run"] === "true",
                });
                output(result, json);
                break;
            }
            case "stats": {
                const result = await stats(cwd);
                output(result, json);
                break;
            }
            case "index-rebuild": {
                const type = (flags["type"] ?? "all");
                await indexRebuild(cwd, type);
                output({ rebuilt: type }, json);
                break;
            }
            case "idea-create": {
                const body = await getBody(flags);
                const result = await ideaCreate(cwd, {
                    title: required(flags, "title"),
                    complexity: validateComplexity(required(flags, "complexity")),
                    body,
                });
                output(result, json);
                break;
            }
            case "idea-list": {
                const VALID_IDEA_STATUS = ["pending", "complete", "all"];
                const statusRaw = flags["status"];
                let status;
                if (statusRaw !== undefined) {
                    if (!VALID_IDEA_STATUS.includes(statusRaw)) {
                        console.error(`Invalid --status value: "${statusRaw}". Must be one of: ${VALID_IDEA_STATUS.join(", ")}`);
                        process.exit(1);
                    }
                    status = statusRaw;
                }
                const limit = flags["limit"] ? parseInt(flags["limit"], 10) : undefined;
                const result = await ideaList(cwd, {
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
                const result = await ideaMove(cwd, id, required(flags, "status"), flags["task-id"]);
                output(result, json);
                break;
            }
            case "report-create": {
                const body = await getBody(flags);
                const result = await reportCreate(cwd, {
                    title: required(flags, "title"),
                    type: validateReportType(required(flags, "type")),
                    severity: validateSeverity(required(flags, "severity")),
                    body,
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
                const result = await reportMove(cwd, id, required(flags, "status"), flags["task-id"]);
                output(result, json);
                break;
            }
            case "learning-create": {
                const body = await getBody(flags);
                const result = await learningCreate(cwd, {
                    title: required(flags, "title"),
                    tags: flags["tags"] ? flags["tags"].split(",").map((t) => t.trim()) : [],
                    body,
                    task: flags["task"],
                });
                output(result, json);
                break;
            }
            case "learning-search": {
                const query = flags["query"] ?? flags["similar-to"];
                const result = await learningSearch(cwd, {
                    tags: flags["tags"] ? flags["tags"].split(",").map((t) => t.trim()) : undefined,
                    query,
                    limit: flags["limit"] ? parseInt(flags["limit"], 10) : undefined,
                    includeBody: flags["body"] === "true",
                });
                output(result, json);
                break;
            }
            case "learning-list": {
                const VALID_STATUS_FILTER = ["active", "archived", "superseded", "all"];
                const includeArchived = flags["include-archived"] === "true";
                const allFlag = flags["all"] === "true";
                const statusRaw = flags["status"];
                let status;
                if (statusRaw !== undefined) {
                    if (!VALID_STATUS_FILTER.includes(statusRaw)) {
                        console.error(`Invalid --status value: "${statusRaw}". Must be one of: ${VALID_STATUS_FILTER.join(", ")}`);
                        process.exit(1);
                    }
                    status = statusRaw;
                }
                else if (includeArchived || allFlag) {
                    status = "all";
                }
                const result = await learningList(cwd, {
                    ...(status !== undefined ? { status } : {}),
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
                const result = await learningMove(cwd, id, "archived");
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
                const updateInput = {
                    ...(flags["title"] !== undefined ? { title: flags["title"] } : {}),
                    ...(flags["tags"] !== undefined ? { tags: flags["tags"].split(",").map((t) => t.trim()) } : {}),
                    ...(body !== undefined ? { body } : {}),
                };
                const result = await learningUpdate(cwd, id, updateInput);
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
                const result = await learningCompress(cwd, id, body);
                output(result, json);
                if (!result.ok && !result.skippedReason)
                    process.exit(2);
                break;
            }
            default:
                console.error(`Unknown command: ${command}\n\nRun 'flowstate --help' for available commands.`);
                process.exit(1);
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (json) {
            console.error(JSON.stringify({ error: message }));
        }
        else {
            console.error(`Error: ${message}`);
        }
        process.exit(1);
    }
}
function output(data, json) {
    if (json) {
        console.log(JSON.stringify(data, null, 2));
    }
    else if (typeof data === "object" && data !== null) {
        if (Array.isArray(data)) {
            for (const item of data) {
                if (typeof item === "object" && item !== null) {
                    const record = item;
                    console.log(Object.values(record)
                        .filter((v) => v !== undefined)
                        .join("\t"));
                }
            }
        }
        else {
            const record = data;
            for (const [key, value] of Object.entries(record)) {
                console.log(`${key}: ${value}`);
            }
        }
    }
    else {
        console.log(data);
    }
}
main();
