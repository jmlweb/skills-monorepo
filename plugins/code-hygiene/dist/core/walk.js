import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
// Generated and vendored trees hold build output, not tests the user wrote.
const SKIPPED_DIRS = new Set([
    "node_modules",
    "dist",
    ".git",
    ".turbo",
    "coverage",
    ".next",
]);
export function walkFiles(root, matches) {
    const found = [];
    const visit = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!SKIPPED_DIRS.has(entry.name))
                    visit(full);
                continue;
            }
            const rel = relative(root, full).split("\\").join("/");
            if (entry.isFile() && matches(rel))
                found.push(rel);
        }
    };
    visit(root);
    return found.sort();
}
