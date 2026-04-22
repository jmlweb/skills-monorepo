#!/usr/bin/env node
// Runs before every git commit.
// For each plugin with staged src/ changes, rebuilds dist/ and re-stages it.

import { execSync } from "node:child_process";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pluginsDir = join(root, "plugins");

function getStagedFiles() {
  try {
    const output = execSync("git diff --cached --name-only", {
      cwd: root,
      encoding: "utf-8",
    });
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function buildPlugin(packageName) {
  execSync(`pnpm turbo run build --filter="${packageName}"`, {
    cwd: root,
    stdio: "inherit",
  });
}

function stagePluginDist(pluginDir) {
  execSync(`git add plugins/${pluginDir}/dist`, {
    cwd: root,
    stdio: "inherit",
  });
}

const staged = getStagedFiles();

const pluginsToBuild = readdirSync(pluginsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .filter((d) => staged.some((f) => f.startsWith(`plugins/${d.name}/src/`)))
  .map((d) => {
    const pkgPath = join(pluginsDir, d.name, "package.json");
    if (!existsSync(pkgPath)) return null;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return { dir: d.name, name: pkg.name };
  })
  .filter(Boolean);

if (pluginsToBuild.length === 0) {
  process.exit(0);
}

console.log(
  `[pre-commit] Building: ${pluginsToBuild.map((p) => p.dir).join(", ")}`
);

for (const plugin of pluginsToBuild) {
  buildPlugin(plugin.name);
  stagePluginDist(plugin.dir);
}

console.log("[pre-commit] dist/ rebuilt and staged.");
