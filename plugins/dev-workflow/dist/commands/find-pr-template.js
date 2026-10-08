import { readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TemplateLookupError } from "../core/errors.js";
const SINGLE_FILE_NAME = "pull_request_template.md";
const TEMPLATE_DIR_NAME = "pull_request_template";
const USER_TEMPLATE_NAME = "pr-template.md";
// src/commands and dist/commands are the same depth below the plugin root.
const DEFAULT_BUILTIN_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../../references/default-pr-template.md");
function isMissing(err) {
    const code = err?.code;
    return code === "ENOENT" || code === "ENOTDIR";
}
// Only "does not exist" counts as absent; any other fs failure must surface
// instead of silently falling through to a lower-precedence template (LRN-001).
function listDir(dir) {
    try {
        return readdirSync(dir);
    }
    catch (err) {
        if (isMissing(err))
            return [];
        throw new TemplateLookupError(`Cannot read directory ${dir}: ${err instanceof Error ? err.message : String(err)}`);
    }
}
function isFile(path) {
    try {
        return statSync(path).isFile();
    }
    catch (err) {
        if (isMissing(err))
            return false;
        throw new TemplateLookupError(`Cannot stat ${path}: ${err instanceof Error ? err.message : String(err)}`);
    }
}
// GitHub matches these names case-insensitively, so do the same.
function findSingleFiles(dir) {
    return listDir(dir)
        .filter((name) => name.toLowerCase() === SINGLE_FILE_NAME)
        .map((name) => join(dir, name))
        .filter(isFile);
}
function findTemplateDirFiles(parent) {
    return listDir(parent)
        .filter((name) => name.toLowerCase() === TEMPLATE_DIR_NAME)
        .flatMap((name) => listDir(join(parent, name))
        .filter((file) => file.toLowerCase().endsWith(".md"))
        .map((file) => join(parent, name, file)))
        .filter(isFile);
}
function findRepoTemplates(cwd) {
    const githubDir = join(cwd, ".github");
    const primary = findSingleFiles(githubDir);
    if (primary.length > 0)
        return [primary[0]];
    return [githubDir, join(cwd, "docs"), cwd]
        .flatMap((dir) => [...findSingleFiles(dir), ...findTemplateDirFiles(dir)])
        .sort();
}
export function findPrTemplate(input) {
    const repo = findRepoTemplates(input.cwd);
    if (repo.length > 0) {
        return {
            source: "repo",
            path: repo.length === 1 ? repo[0] : null,
            candidates: repo,
        };
    }
    if (input.userDir) {
        const userPath = join(input.userDir, USER_TEMPLATE_NAME);
        if (isFile(userPath)) {
            return { source: "user", path: userPath, candidates: [userPath] };
        }
    }
    const builtin = input.builtinPath ?? DEFAULT_BUILTIN_PATH;
    if (!isFile(builtin)) {
        throw new TemplateLookupError(`Built-in PR template missing: ${builtin}`);
    }
    return { source: "builtin", path: builtin, candidates: [builtin] };
}
