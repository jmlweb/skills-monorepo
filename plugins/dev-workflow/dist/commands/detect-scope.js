import { readPackageInfo } from "../core/packages.js";
const WORKSPACE_DIRS = ["apps", "packages", "plugins"];
const BRANCH_PREFIXES = [
    "feature",
    "feat",
    "fix",
    "bugfix",
    "hotfix",
    "chore",
    "refactor",
    "task",
    "docs",
    "test",
    "perf",
    "release",
    "ci",
    "build",
    "style",
];
const EXCLUDED_BRANCHES = new Set([
    "main",
    "master",
    "develop",
    "dev",
    "trunk",
]);
const TASK_ID_REGEX = /^[A-Z]+-\d+$/;
export function detectScopeFromFiles(files, readPackageName) {
    const scopes = [];
    const seen = new Set();
    for (const file of files) {
        const parts = file.split("/");
        if (parts.length < 2)
            continue;
        const top = parts[0];
        const name = parts[1];
        if (!top || !name)
            continue;
        if (!WORKSPACE_DIRS.includes(top))
            continue;
        const scope = top === "apps" ? name : (readPackageName(top, name) ?? name);
        if (!seen.has(scope)) {
            seen.add(scope);
            scopes.push(scope);
        }
    }
    return scopes;
}
export function detectScopeFromBranch(branch) {
    if (!branch)
        return null;
    const stripped = stripBranchPrefix(branch);
    const lastSegment = stripped.split("/").pop() ?? "";
    if (!lastSegment || EXCLUDED_BRANCHES.has(lastSegment.toLowerCase())) {
        return null;
    }
    if (TASK_ID_REGEX.test(lastSegment)) {
        return lastSegment;
    }
    const firstWord = lastSegment.split(/[-_]/)[0] ?? "";
    if (!firstWord || EXCLUDED_BRANCHES.has(firstWord.toLowerCase())) {
        return null;
    }
    return firstWord;
}
export function detectScope(files, branch, readPackageName) {
    const scopes = detectScopeFromFiles(files, readPackageName);
    if (scopes.length > 0) {
        const suggested = scopes.length === 1
            ? scopes[0]
            : scopes.length === 2
                ? scopes.join(",")
                : null;
        return { scopes, suggested, source: "files" };
    }
    const branchScope = detectScopeFromBranch(branch);
    if (branchScope) {
        return { scopes: [branchScope], suggested: branchScope, source: "branch" };
    }
    return { scopes: [], suggested: null, source: "none" };
}
export function readPackageNameFromDisk(cwd, workspaceDir, dirName) {
    return readPackageInfo(cwd, `${workspaceDir}/${dirName}`)?.shortName ?? null;
}
function stripBranchPrefix(branch) {
    for (const prefix of BRANCH_PREFIXES) {
        const re = new RegExp(`^${prefix}[/-]`, "i");
        const match = re.exec(branch);
        if (match)
            return branch.slice(match[0].length);
    }
    return branch;
}
