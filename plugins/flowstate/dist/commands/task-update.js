import { join } from "node:path";
import { taskDir } from "../core/paths.js";
import { findEntityFile, readEntity, writeEntity } from "../core/fs.js";
import { today } from "../core/date.js";
import { EntityNotFoundError, InvalidArgumentError, SectionNotFoundError, } from "../core/errors.js";
import { appendToSection, hasSection, tickCriteria } from "../core/markdown.js";
const SEARCH_DIRS = ["pending", "active", "complete"];
export async function taskUpdate(cwd, id, updates, log, checkCriteria = []) {
    let filePath;
    for (const status of SEARCH_DIRS) {
        const dir = taskDir(cwd, status);
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
        body = tickCriteria(body, checkCriteria);
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
