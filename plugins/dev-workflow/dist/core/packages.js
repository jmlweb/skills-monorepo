import { readFileSync } from "node:fs";
import { join } from "node:path";
export function readPackageInfo(cwd, relativeDir) {
    try {
        const pkgPath = join(cwd, relativeDir, "package.json");
        const contents = readFileSync(pkgPath, "utf-8");
        const json = JSON.parse(contents);
        if (typeof json.name !== "string" || !json.name)
            return null;
        const slash = json.name.lastIndexOf("/");
        const shortName = slash === -1 ? json.name : json.name.slice(slash + 1);
        return {
            name: json.name,
            shortName,
            private: json.private === true,
            dir: relativeDir,
        };
    }
    catch {
        return null;
    }
}
