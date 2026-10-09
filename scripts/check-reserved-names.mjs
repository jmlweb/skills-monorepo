/**
 * Guards AGENTS.md invariant 7 and named mistake 15:
 *  1. reserved names stay dead: no `plan-create` reference, no skill named
 *     `plan` or `init`, no `plans/` path outside migration code;
 *  2. every `plugins/<name>/dist/**\/*.js` maps to a `src/**\/*.ts` module, so
 *     stale pre-rename artifacts (e.g. `plan-create.js`) cannot linger. tsc
 *     never deletes outputs whose source vanished, and dist/ is committed.
 *
 * Usage: node scripts/check-reserved-names.mjs [rootDir]
 * Exit codes: 0 clean, 1 findings, 2 setup error (unreadable layout).
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export class SetupError extends Error {}

const RESERVED_SKILL_NAMES = ["plan", "init"];

// Only places that ship behaviour or prompts. Plugin-level CLAUDE.md, AGENTS.md
// and .backlog/ explain the renames and so must mention the old names.
const SCANNED_DIRS = ["src", "skills", "agents", "hooks", "references", "shared", "evals"];
const SCANNED_ROOT_FILES = ["README.md", "SKILL.md"];

// `plans/` is legitimately named only where the rename is migrated: setup.ts
// moves an old `plans/` backlog dir to `ideas/`, and its test exercises that.
// Paths are repo-relative with forward slashes.
export const MIGRATION_ALLOWLIST = [
  "plugins/flowstate/src/commands/setup.ts",
  "plugins/flowstate/src/commands/setup.test.ts",
];

const PATTERNS = [
  { name: "plan-create", regex: /(?<![\w-])plan-create(?![\w-])/, allowMigration: false },
  { name: "plans/", regex: /(?<![\w-])plans\//, allowMigration: true },
];

function listDirs(dir) {
  // readdirSync throws on a missing dir: a lookup failure must not read as "nothing found" (LRN-001).
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

function walkFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walkFiles(full);
    return entry.isFile() ? [full] : [];
  });
}

const toPosix = (rootDir, file) => relative(rootDir, file).split(sep).join("/");

function pluginNamesOf(rootDir) {
  const pluginsDir = join(rootDir, "plugins");
  if (!existsSync(pluginsDir)) throw new SetupError(`No plugins directory at ${pluginsDir}`);
  const names = listDirs(pluginsDir);
  if (names.length === 0) throw new SetupError(`No plugin directories found in ${pluginsDir}`);
  return names;
}

function frontmatterName(file) {
  const block = readFileSync(file, "utf-8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const line = block?.[1]?.match(/^name:\s*(.+?)\s*$/m);
  return line?.[1]?.replace(/^["']|["']$/g, "") ?? null;
}

export function collectReservedSkillNames(rootDir) {
  return pluginNamesOf(rootDir).flatMap((plugin) => {
    const skillsDir = join(rootDir, "plugins", plugin, "skills");
    if (!existsSync(skillsDir)) return [];
    return listDirs(skillsDir).flatMap((dir) => {
      const skillFile = join(skillsDir, dir, "SKILL.md");
      const names = [
        { value: dir, label: "directory" },
        ...(existsSync(skillFile) ? [{ value: frontmatterName(skillFile), label: "frontmatter name" }] : []),
      ]
      return names
        .filter(({ value }) => value !== null && RESERVED_SKILL_NAMES.includes(value))
        .map(
          ({ value, label }) =>
            `${toPosix(rootDir, existsSync(skillFile) ? skillFile : join(skillsDir, dir))}: skill ${label} "${value}" is reserved (collides with Claude Code's native /${value})`,
        );
    });
  });
}

export function collectReservedReferences(rootDir) {
  return pluginNamesOf(rootDir).flatMap((plugin) => {
    const pluginDir = join(rootDir, "plugins", plugin);
    const files = [
      ...SCANNED_DIRS.map((d) => join(pluginDir, d)).filter((d) => existsSync(d)).flatMap(walkFiles),
      ...SCANNED_ROOT_FILES.map((f) => join(pluginDir, f)).filter((f) => existsSync(f)),
    ];
    return files.flatMap((file) => {
      const rel = toPosix(rootDir, file);
      const isMigration = MIGRATION_ALLOWLIST.includes(rel);
      return readFileSync(file, "utf-8")
        .split(/\r?\n/)
        .flatMap((line, index) =>
          PATTERNS.filter((p) => p.regex.test(line) && !(p.allowMigration && isMigration)).map(
            (p) => `${rel}:${index + 1}: reserved name "${p.name}" outside migration code`,
          ),
        );
    });
  });
}

const isBuildOutput = (name) => name.endsWith(".js");
const isSourceModule = (name) => name.endsWith(".ts") && !name.endsWith(".d.ts") && !name.endsWith(".test.ts");

function modulesUnder(dir, matches) {
  return walkFiles(dir)
    .filter((f) => matches(f))
    .map((f) => relative(dir, f).split(sep).join("/").replace(/\.(js|ts)$/, ""));
}

export function collectStaleDist(rootDir) {
  return pluginNamesOf(rootDir).flatMap((plugin) => {
    const pluginDir = join(rootDir, "plugins", plugin);
    const srcDir = join(pluginDir, "src");
    const distDir = join(pluginDir, "dist");
    const hasSrc = existsSync(srcDir);
    const hasDist = existsSync(distDir);
    // Neither dir: a prompt-only plugin, nothing to compare.
    if (!hasSrc && !hasDist) return [];
    if (hasSrc && !hasDist) throw new SetupError(`Plugin "${plugin}": ${distDir} missing (run 'pnpm build' first)`);
    if (!hasSrc || !statSync(srcDir).isDirectory()) {
      return [`plugins/${plugin}/dist: exists but plugins/${plugin}/src does not, so every dist file is stale`];
    }
    const sources = new Set(modulesUnder(srcDir, (f) => isSourceModule(f)));
    if (sources.size === 0) throw new SetupError(`Plugin "${plugin}": no source modules under ${srcDir}`);
    const built = modulesUnder(distDir, (f) => isBuildOutput(f));
    if (built.length === 0) throw new SetupError(`Plugin "${plugin}": no .js files under ${distDir} (run 'pnpm build' first)`);
    return built
      .filter((mod) => !sources.has(mod))
      .map(
        (mod) =>
          `plugins/${plugin}/dist/${mod}.js: no matching plugins/${plugin}/src/${mod}.ts (stale build artifact; remove it with git rm and rebuild)`,
      );
  });
}

export function check(rootDir) {
  return [...collectReservedSkillNames(rootDir), ...collectReservedReferences(rootDir), ...collectStaleDist(rootDir)];
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const rootDir = resolve(process.argv[2] ?? fileURLToPath(new URL("..", import.meta.url)));
  try {
    const problems = check(rootDir);
    if (problems.length === 0) {
      console.log("No reserved names outside migration code and no stale dist files");
    } else {
      for (const p of problems) console.error(`ERROR: ${p}`);
      console.error("");
      console.error("Reserved names (plan, init, plan-create, plans/) stay dead: see AGENTS.md invariant 7.");
      process.exit(1);
    }
  } catch (err) {
    if (!(err instanceof SetupError)) throw err;
    console.error(`ERROR: ${err.message}`);
    process.exit(2);
  }
}
