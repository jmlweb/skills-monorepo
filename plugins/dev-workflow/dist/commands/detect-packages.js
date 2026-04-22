const WORKSPACE_DIRS = ["apps", "packages", "plugins"];
export function detectPackages(files, readPackage, options = {}) {
    const includePrivate = options.includePrivate ?? false;
    const seen = new Map();
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
        const relDir = `${top}/${name}`;
        if (seen.has(relDir))
            continue;
        const info = readPackage(relDir);
        if (!info)
            continue;
        if (!includePrivate && info.private)
            continue;
        seen.set(relDir, {
            name: info.name,
            shortName: info.shortName,
            private: info.private,
            dir: info.dir,
        });
    }
    return [...seen.values()];
}
