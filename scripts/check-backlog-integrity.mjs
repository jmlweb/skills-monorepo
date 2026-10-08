/**
 * Fails when .backlog drifted from what the flowstate CLI would produce:
 *  1. a committed index.md differs from the result of `index-rebuild`
 *     (hand-edited index), or
 *  2. an entity's frontmatter `status` contradicts the folder it lives in
 *     (hand-edited frontmatter or a file moved without `task-move`).
 *
 * The rebuild runs against a temp copy of .backlog (via FLOWSTATE_BACKLOG_DIR)
 * so the real backlog is never mutated.
 *
 * Usage: node scripts/check-backlog-integrity.mjs [rootDir]
 * Exit codes: 0 clean, 1 drift found, 2 setup error (no backlog, no built CLI).
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Mirrors flowstate's TaskStatus/IdeaStatus/ReportStatus vocabulary; `blocked`
// tasks live under tasks/active because blocking is a flag, not a folder.
const FOLDER_STATUSES = {
  "tasks/pending": ["pending"],
  "tasks/active": ["active", "blocked"],
  "tasks/complete": ["complete"],
  "ideas/pending": ["pending"],
  "ideas/complete": ["approved", "discarded"],
  "reports/pending": ["pending"],
  "reports/complete": ["triaged", "discarded"],
};

const INDEX_FILES = ["tasks/index.md", "learnings/index.md"];

export class SetupError extends Error {}

function readStatus(path) {
  const frontmatter = readFileSync(path, "utf-8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const line = frontmatter?.[1]?.match(/^status:\s*(.+?)\s*$/m);
  return line?.[1]?.replace(/^["']|["']$/g, "") ?? null;
}

export function collectStatusMismatches(backlogDir) {
  const problems = [];
  for (const [folder, allowed] of Object.entries(FOLDER_STATUSES)) {
    const dir = join(backlogDir, folder);
    // A missing entity folder is a broken backlog, not an empty one (LRN-001).
    if (!existsSync(dir)) throw new SetupError(`Missing backlog folder: ${dir}`);
    for (const name of readdirSync(dir).filter((n) => n.endsWith(".md") && n !== "index.md")) {
      const status = readStatus(join(dir, name));
      if (status === null || !allowed.includes(status)) {
        problems.push(
          `${join(".backlog", folder, name)}: status "${status ?? "(missing)"}" does not belong in ${folder}/ (expected ${allowed.join(" or ")})`
        );
      }
    }
  }
  return problems;
}

export function collectIndexDrift(rootDir, backlogDir) {
  const cli = join(rootDir, "plugins", "flowstate", "dist", "bin", "flowstate.js");
  if (!existsSync(cli)) {
    throw new SetupError(`Flowstate CLI not built: ${cli} (run 'pnpm build' first)`);
  }

  const copy = mkdtempSync(join(tmpdir(), "backlog-integrity-"));
  try {
    cpSync(backlogDir, copy, { recursive: true });
    const run = spawnSync("node", [cli, "index-rebuild"], {
      cwd: rootDir,
      env: { ...process.env, FLOWSTATE_BACKLOG_DIR: copy },
      encoding: "utf-8",
    });
    if (run.status !== 0) {
      throw new SetupError(`index-rebuild failed: ${(run.stderr || run.stdout).trim()}`);
    }
    return INDEX_FILES.filter((rel) => {
      const real = join(backlogDir, rel);
      if (!existsSync(real)) throw new SetupError(`Missing index file: ${real}`);
      return readFileSync(real, "utf-8") !== readFileSync(join(copy, rel), "utf-8");
    }).map(
      (rel) =>
        `.backlog/${rel}: differs from 'flowstate index-rebuild' output (hand-edited?). Regenerate it with the CLI.`
    );
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}

export function check(rootDir) {
  const backlogDir = join(rootDir, ".backlog");
  if (!existsSync(backlogDir) || !statSync(backlogDir).isDirectory()) {
    throw new SetupError(`No backlog directory at ${backlogDir}`);
  }
  return [...collectStatusMismatches(backlogDir), ...collectIndexDrift(rootDir, backlogDir)];
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const rootDir = resolve(process.argv[2] ?? fileURLToPath(new URL("..", import.meta.url)));
  try {
    const problems = check(rootDir);
    if (problems.length === 0) {
      console.log("Backlog indexes and status/folder placement are consistent");
    } else {
      for (const p of problems) console.error(`ERROR: ${p}`);
      console.error("");
      console.error("Backlog files are CLI-owned: use task-move / task-update / index-rebuild, never hand-edit.");
      process.exit(1);
    }
  } catch (err) {
    if (!(err instanceof SetupError)) throw err;
    console.error(`ERROR: ${err.message}`);
    process.exit(2);
  }
}
