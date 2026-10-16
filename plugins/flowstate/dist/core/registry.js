import { appendFile, mkdir, readFile } from "node:fs/promises";
import { existsSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { RegistryReadError } from "./errors.js";
import { learningsDir, SHARED_LEARNINGS_ENV } from "./paths.js";
export function isSharedEnabled(env = process.env) {
    return env[SHARED_LEARNINGS_ENV] !== "off";
}
export function registryPath(env = process.env) {
    const xdgConfig = env["XDG_CONFIG_HOME"];
    const configHome = xdgConfig !== undefined && xdgConfig !== ""
        ? xdgConfig
        : join(env["HOME"] ?? homedir(), ".config");
    return join(configHome, "flowstate", "backlogs");
}
// realpath folds /var and /private/var (macOS temp dirs) into one backlog identity.
export function canonicalBacklogPath(dir) {
    const absolute = resolve(dir);
    return existsSync(absolute) ? realpathSync(absolute) : absolute;
}
export async function readRegistry(env = process.env) {
    const file = registryPath(env);
    let content;
    try {
        content = await readFile(file, "utf-8");
    }
    catch (error) {
        // No registry yet means no backlog has registered; any other failure must surface.
        if (error.code === "ENOENT")
            return [];
        throw new RegistryReadError(file, error);
    }
    return content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
}
export async function registerBacklog(dir, env = process.env) {
    const entry = canonicalBacklogPath(dir);
    if ((await readRegistry(env)).includes(entry))
        return;
    const file = registryPath(env);
    await mkdir(dirname(file), { recursive: true });
    await appendFile(file, `${entry}\n`, "utf-8");
}
// Entries are skipped with a reason, never pruned: an unmounted disk keeps its entry.
export async function resolveSharedBacklogs(root, env = process.env) {
    if (!isSharedEnabled(env))
        return { sources: [], skipped: [] };
    const seen = new Set([canonicalBacklogPath(root)]);
    const sources = [];
    const skipped = [];
    for (const path of await readRegistry(env)) {
        // A relative path would resolve against the caller's cwd, which is not stable.
        if (!isAbsolute(path)) {
            skipped.push({ path, reason: "relative path in registry" });
            continue;
        }
        const dir = canonicalBacklogPath(path);
        if (seen.has(dir))
            continue;
        seen.add(dir);
        if (!existsSync(dir)) {
            skipped.push({ path, reason: "missing" });
            continue;
        }
        const lDir = learningsDir(dir);
        if (!existsSync(lDir) || !statSync(lDir).isDirectory()) {
            skipped.push({ path, reason: "no learnings/ dir" });
            continue;
        }
        sources.push({ root: dir, label: labelFor(dir) });
    }
    return { sources, skipped };
}
// Local first, so callers that rank with a stable sort keep local learnings ahead on ties.
export function learningSources(root, scope, shared) {
    const local = { root, label: "local" };
    return scope === "local" ? [local] : [local, ...shared];
}
function labelFor(dir) {
    return basename(dir) === ".backlog" ? basename(dirname(dir)) : basename(dir);
}
