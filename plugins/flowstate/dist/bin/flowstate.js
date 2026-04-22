#!/usr/bin/env node
import { setup } from "../commands/setup.js";
import { nextId } from "../commands/next-id.js";
import { taskCreate } from "../commands/task-create.js";
import { taskList } from "../commands/task-list.js";
import { taskMove } from "../commands/task-move.js";
import { taskBlock } from "../commands/task-block.js";
import { taskUpdate } from "../commands/task-update.js";
import { taskUnblock } from "../commands/task-unblock.js";
import { stats } from "../commands/stats.js";
import { indexRebuild } from "../commands/index-rebuild.js";
import { ideaCreate } from "../commands/idea-create.js";
import { ideaMove } from "../commands/idea-move.js";
import { reportCreate } from "../commands/report-create.js";
import { reportMove } from "../commands/report-move.js";
import { learningCreate } from "../commands/learning-create.js";
import { learningSearch } from "../commands/learning-search.js";
import { learningList } from "../commands/learning-list.js";
import { learningMove } from "../commands/learning-move.js";
import { learningUpdate } from "../commands/learning-update.js";
import { validatePriority, validateComplexity, validateReportType, validateSeverity } from "../core/types.js";
import { findBacklogRoot } from "../core/paths.js";
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
        console.error("Usage: flowstate <command> [args]\n\nCommands: setup, next-id, task-create, task-list, task-move, task-block, task-update, task-unblock, stats, index-rebuild, idea-create, idea-move, report-create, report-move, learning-create, learning-search, learning-list, learning-move, learning-update");
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
                const type = positional[0];
                if (!type) {
                    console.error("Usage: flowstate next-id <task|idea|report|learning>");
                    process.exit(1);
                }
                const id = await nextId(cwd, type);
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
                const status = flags["status"];
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
                const result = await learningSearch(cwd, {
                    tags: flags["tags"] ? flags["tags"].split(",").map((t) => t.trim()) : undefined,
                    query: flags["query"],
                    limit: flags["limit"] ? parseInt(flags["limit"], 10) : undefined,
                    includeBody: flags["body"] === "true",
                });
                output(result, json);
                break;
            }
            case "learning-list": {
                const result = await learningList(cwd, {
                    all: flags["all"] === "true",
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
            default:
                console.error(`Unknown command: ${command}`);
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
