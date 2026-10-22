import { today } from "../core/date.js";
import { EntityNotFoundError } from "../core/errors.js";
import { replaceSection, hasSection, appendToSection, appendToBody } from "../core/markdown.js";
const MIN_PROGRESS_LOG_ENTRIES_TO_TRIM = 4;
const MIN_NOTES_CONTENT_LENGTH = 1;
export async function taskCondense(store, id) {
    const task = await store.find("task", id, ["complete"]);
    if (!task) {
        throw new EntityNotFoundError(id, "tasks/complete");
    }
    return condenseTask(store, task, id);
}
export async function taskCondenseAll(store) {
    const results = [];
    for (const task of await store.list("task", ["complete"])) {
        const id = String(task.frontmatter["id"] ?? "");
        if (!id)
            continue;
        results.push(await condenseTask(store, task, id));
    }
    return results;
}
async function condenseTask(store, task, id) {
    const filePath = task.path;
    const fm = { ...task.frontmatter };
    // Heal-on-read: task is in the complete bucket, so status must be "complete".
    // Normalize any drifted value (e.g. "completed", "done", "pending") so
    // downstream tooling and indexes stay consistent.
    const statusHealed = fm["status"] !== "complete";
    if (statusHealed) {
        fm["status"] = "complete";
    }
    const bytesBefore = Buffer.byteLength(task.body, "utf-8");
    if (fm["condensed"] === true || fm["condensed"] === "true") {
        if (statusHealed) {
            await store.save(task, fm, task.body);
        }
        return {
            id,
            path: filePath,
            condensed: false,
            bytesBefore,
            bytesAfter: bytesBefore,
            skippedReason: "already condensed",
        };
    }
    let body = task.body;
    let changed = false;
    if (hasSection(body, "Notes")) {
        const notesContent = extractSection(body, "Notes");
        if (notesContent.trim().length >= MIN_NOTES_CONTENT_LENGTH) {
            body = replaceSection(body, "Notes", "");
            changed = true;
        }
    }
    if (hasSection(body, "Progress Log")) {
        const log = extractSection(body, "Progress Log");
        const entries = log.split("\n").filter((l) => l.trim().startsWith("- "));
        if (entries.length >= MIN_PROGRESS_LOG_ENTRIES_TO_TRIM) {
            const first = entries[0];
            const last = entries[entries.length - 1];
            const trimmed = [first, last].join("\n");
            body = replaceSection(body, "Progress Log", trimmed);
            changed = true;
        }
    }
    if (!changed) {
        if (statusHealed) {
            await store.save(task, fm, body);
        }
        return {
            id,
            path: filePath,
            condensed: false,
            bytesBefore,
            bytesAfter: bytesBefore,
            skippedReason: "already lean",
        };
    }
    if (hasSection(body, "Progress Log")) {
        body = appendToSection(body, "Progress Log", `- [${today()}] Condensed`);
    }
    else {
        body = appendToBody(body, `- [${today()}] Condensed`);
    }
    fm["condensed"] = true;
    await store.save(task, fm, body);
    const after = await store.find("task", id, ["complete"]);
    const bytesAfter = Buffer.byteLength(after?.body ?? body, "utf-8");
    return { id, path: filePath, condensed: true, bytesBefore, bytesAfter };
}
function extractSection(content, heading) {
    const lines = content.split("\n");
    const headingPattern = new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$`);
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
        if (headingPattern.test(lines[i])) {
            start = i + 1;
            break;
        }
    }
    if (start === -1)
        return "";
    let end = lines.length;
    for (let i = start; i < lines.length; i++) {
        if (/^#{1,2}\s/.test(lines[i])) {
            end = i;
            break;
        }
    }
    return lines.slice(start, end).join("\n");
}
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
