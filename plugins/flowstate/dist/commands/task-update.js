import { join } from "node:path";
import { taskDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity } from "../core/fs.js";
import { today } from "../core/date.js";
import { EntityNotFoundError, InvalidArgumentError, SectionNotFoundError, } from "../core/errors.js";
import { appendToSection, hasSection, tickCriteria } from "../core/markdown.js";
const SEARCH_DIRS = ["pending", "active", "complete"];
export function parseEvidence(value) {
    if (value === undefined)
        return {};
    const usage = `Invalid --evidence value. Use a JSON object keyed by criterion number, e.g. --evidence '{"2":"pnpm test → exit 0"}'.`;
    let parsed;
    try {
        parsed = JSON.parse(value);
    }
    catch {
        throw new InvalidArgumentError(usage);
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new InvalidArgumentError(usage);
    }
    const result = {};
    for (const [key, proof] of Object.entries(parsed)) {
        if (!/^\d+$/.test(key) || typeof proof !== "string" || proof.trim() === "") {
            throw new InvalidArgumentError(usage);
        }
        result[Number(key)] = proof;
    }
    return result;
}
export async function taskUpdate(root, id, updates, log, checkCriteria = [], evidence = {}) {
    let filePath;
    for (const status of SEARCH_DIRS) {
        const dir = taskDir(root, status);
        const found = await findEntityFile(dir, id);
        if (found) {
            filePath = join(dir, found);
            break;
        }
    }
    if (!filePath) {
        throw new EntityNotFoundError(id, "tasks/{pending,active,complete}");
    }
    const REJECTED_KEYS = ["status", "blocked-by"];
    for (const key of Object.keys(updates)) {
        if (REJECTED_KEYS.includes(key)) {
            throw new InvalidArgumentError(`Cannot set "${key}" via task-update. Use task-move for status transitions or task-block/task-unblock for blocking.`);
        }
    }
    for (const key of Object.keys(evidence)) {
        if (!checkCriteria.includes(Number(key))) {
            throw new InvalidArgumentError(`--evidence key "${key}" is not in --check. Evidence can only be attached to criteria ticked in the same call.`);
        }
    }
    const doc = await readEntity(filePath);
    const fm = { ...doc.frontmatter };
    for (const [key, value] of Object.entries(updates)) {
        fm[key] = value;
    }
    let body = doc.body;
    if (checkCriteria.length > 0) {
        if (!hasSection(body, "Acceptance Criteria")) {
            throw new SectionNotFoundError(id, "Acceptance Criteria");
        }
        body = tickCriteria(body, checkCriteria, evidence, today());
    }
    const logLines = (log ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (logLines.length > 0) {
        if (!hasSection(body, "Progress Log")) {
            throw new SectionNotFoundError(id, "Progress Log");
        }
        const date = today();
        for (const line of logLines) {
            body = appendToSection(body, "Progress Log", `- [${date}] ${line}`);
        }
    }
    await writeEntity(filePath, fm, body);
    return { path: filePath };
}
