/**
 * Synchronizes plugin versions from each plugin's plugin.json
 * into the root marketplace.json.
 *
 * Usage: node scripts/version-sync.js
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const rootDir = new URL("..", import.meta.url).pathname;
const pluginsDir = join(rootDir, "plugins");
const marketplacePath = join(rootDir, ".claude-plugin", "marketplace.json");

function readJSON(path) {
  let raw;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (err) {
    throw new Error(`Failed to read ${path}: ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse ${path}: ${err.message}`);
  }
}

const marketplace = readJSON(marketplacePath);

const pluginDirs = readdirSync(pluginsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let changed = false;

for (const dir of pluginDirs) {
  const pluginJsonPath = join(pluginsDir, dir, ".claude-plugin", "plugin.json");
  if (!existsSync(pluginJsonPath)) continue;

  const pluginJson = readJSON(pluginJsonPath);
  const entry = marketplace.plugins.find((p) => p.name === pluginJson.name);

  if (!entry) {
    console.warn(`Plugin "${pluginJson.name}" not found in marketplace.json`);
    continue;
  }

  if (entry.version !== pluginJson.version) {
    console.log(`${pluginJson.name}: ${entry.version} → ${pluginJson.version}`);
    entry.version = pluginJson.version;
    changed = true;
  }
}

if (changed) {
  writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n");
  console.log("marketplace.json updated");
} else {
  console.log("All versions in sync");
}
