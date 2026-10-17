#!/usr/bin/env node
// Live test harness for /flowstate:kickstart. The skill writes project files
// and creates a backlog, so it runs in a throwaway repo holding only a README,
// fed the temperature-tower brief, using the plugin source rather than the
// installed copy.
//
//   pnpm sandbox:kickstart          build, fresh sandbox, open Claude, check
//   pnpm sandbox:kickstart setup    fresh sandbox only
//   pnpm sandbox:kickstart check    re-check the current sandbox
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createGitSandbox, git, runHarness, sandboxDir } from "./sandbox-lib.mjs";

export const DEFAULT_DIR = sandboxDir("kickstart");

export const BRIEF =
  "A temperature tower G-code generator for PrusaSlicer users: the user downloads a tower STL, slices it with their own " +
  "material profile, and the tool rewrites the hotend temperature per band, taking its defaults from the sliced G-code. " +
  "Goal: portfolio. Accept every recommendation and approve every checkpoint without asking for changes.";

// Libraries and frameworks an ADR Decision might leak. Domain products the
// project targets (PrusaSlicer, OrcaSlicer) are allowed, and so are English
// words that double as library names (express, react, click).
export const DENY_LIST = [
  "socket.io", "fastify", "django", "flask", "fastapi", "electron", "tauri", "next.js", "nextjs", "vue", "svelte",
  "angular", "prisma", "postgresql", "mongodb", "redis", "sqlite", "tailwind", "webpack", "vite", "yargs", "typer",
  "pyqt", "tkinter", "streamlit", "numpy", "pandas",
];

const README = `# temp-tower

Empty project; the brief lives in the kickstart prompt.
`;

export function createSandbox(dir = DEFAULT_DIR) {
  return createGitSandbox(dir, [{ files: { "README.md": README }, message: "chore: initial readme", date: "2025-01-10T10:00:00" }]);
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mentions = (text, word) => new RegExp(`(^|[^\\w.])${escape(word)}(?![\\w])`, "i").test(text);

const listFiles = (dir, pattern) => (existsSync(dir) ? readdirSync(dir).filter((f) => pattern.test(f)) : []);

export function checkSandbox(dir = DEFAULT_DIR) {
  const failures = [];
  const base = readFileSync(join(dir, ".git", "sandbox-base"), "utf-8").trim();
  if (git(dir, ["rev-parse", "HEAD"]) !== base) failures.push("a commit was made; kickstart must never commit");

  for (const path of ["docs/evaluation.md", "docs/overview.md", "AGENTS.md"]) {
    if (!existsSync(join(dir, path))) failures.push(`${path} is missing`);
  }

  const adrDir = join(dir, "docs", "adr");
  const adrs = listFiles(adrDir, /^\d{4}-.+\.md$/);
  if (adrs.length === 0) failures.push("no ADR files in docs/adr/ (expected NNNN-<slug>.md)");
  for (const adr of adrs) {
    const text = readFileSync(join(adrDir, adr), "utf-8");
    const leaked = DENY_LIST.filter((word) => mentions(text, word));
    if (leaked.length) failures.push(`docs/adr/${adr} names a library or framework: ${leaked.join(", ")}`);
  }

  const claude = join(dir, "CLAUDE.md");
  if (!existsSync(claude)) failures.push("CLAUDE.md is missing");
  else if (!lstatSync(claude).isSymbolicLink()) failures.push("CLAUDE.md is not a symlink");
  else if (readlinkSync(claude) !== "AGENTS.md") failures.push(`CLAUDE.md links to ${readlinkSync(claude)}, expected AGENTS.md`);

  const tasks = listFiles(join(dir, ".backlog", "tasks", "pending"), /^TSK-\d+.*\.md$/);
  if (tasks.length === 0) failures.push("no tasks in .backlog/tasks/pending/");

  const changed = git(dir, ["status", "--porcelain", "--untracked-files=all"]).split("\n").filter(Boolean);
  return { ok: failures.length === 0, failures, changed };
}

function printExpectations() {
  console.log(`Expected (the prompt auto-accepts every round and checkpoint):
  evaluation  docs/evaluation.md names OrcaSlicer's native temperature tower generator (WebSearch results vary: check by eye)
  ADRs        docs/adr/0001-….md onward, mechanism classes only; no library from the deny-list
  docs        AGENTS.md, CLAUDE.md -> AGENTS.md symlink, docs/overview.md
  review      flowstate:kickstart-reviewer findings shown, fixes applied, ADRs accepted
  tasks       a walking skeleton in .backlog/tasks/pending/ with depends-on links
Shared learnings are off for this session (FLOWSTATE_SHARED=off), so the sandbox backlog stays out of the registry.
`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(
    runHarness({
      pluginName: "flowstate",
      skill: "kickstart",
      args: BRIEF,
      env: { FLOWSTATE_SHARED: "off" },
      dir: DEFAULT_DIR,
      create: createSandbox,
      check: checkSandbox,
      printExpectations,
      passMessage: "no commit, evaluation + ADRs + AGENTS.md + overview written, CLAUDE.md symlinked, no library in ADRs, tasks seeded",
      mode: process.argv[2],
    }),
  );
}
