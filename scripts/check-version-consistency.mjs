/**
 * Fails when a plugin's version differs between its version locations:
 * package.json, .claude-plugin/plugin.json, the root marketplace.json entry,
 * and the plugin's root SKILL.md frontmatter (when present).
 *
 * A hand-edit of any single location leaves it disagreeing with the others,
 * so comparing the locations catches partial bumps without needing a base ref.
 * version-sync.js only repairs marketplace.json; this gate covers the rest.
 *
 * Usage: node scripts/check-version-consistency.mjs [rootDir]
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function readJSON(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch (err) {
    throw new Error(`Failed to read ${path}: ${err.message}`);
  }
}

function readSkillVersion(path) {
  const frontmatter = readFileSync(path, "utf-8").match(/^---\n([\s\S]*?)\n---/);
  const line = frontmatter?.[1]?.match(/^version:\s*(.+?)\s*$/m);
  return line?.[1] ?? null;
}

export function collectMismatches(rootDir) {
  const pluginsDir = join(rootDir, "plugins");
  const marketplace = readJSON(join(rootDir, ".claude-plugin", "marketplace.json"));
  const mismatches = [];

  const pluginNames = readdirSync(pluginsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dir of pluginNames) {
    const pluginRoot = join(pluginsDir, dir);
    const pluginJsonPath = join(pluginRoot, ".claude-plugin", "plugin.json");
    if (!existsSync(pluginJsonPath)) continue;

    const pluginJson = readJSON(pluginJsonPath);
    const locations = { "plugin.json": pluginJson.version };

    const pkgPath = join(pluginRoot, "package.json");
    if (existsSync(pkgPath)) locations["package.json"] = readJSON(pkgPath).version;

    const skillPath = join(pluginRoot, "SKILL.md");
    if (existsSync(skillPath)) locations["SKILL.md"] = readSkillVersion(skillPath);

    locations["marketplace.json"] = marketplace.plugins.find(
      (p) => p.name === pluginJson.name
    )?.version;

    if (new Set(Object.values(locations)).size > 1) {
      mismatches.push({ plugin: dir, locations });
    }
  }
  return mismatches;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const rootDir = resolve(process.argv[2] ?? fileURLToPath(new URL("..", import.meta.url)));
  const mismatches = collectMismatches(rootDir);

  if (mismatches.length === 0) {
    console.log("All plugin versions are consistent");
  } else {
    for (const { plugin, locations } of mismatches) {
      console.error(`ERROR: version mismatch in plugin "${plugin}":`);
      for (const [file, version] of Object.entries(locations)) {
        console.error(`  ${file}: ${version ?? "(missing)"}`);
      }
    }
    console.error("");
    console.error("Versions must never be hand-edited in a single file.");
    console.error("Run 'pnpm bump <patch|minor|major|x.y.z>' inside the plugin dir to update every location.");
    process.exit(1);
  }
}
