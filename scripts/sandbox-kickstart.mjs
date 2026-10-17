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

// The skill's own bound on seeded tasks.
export const TASK_RANGE = { min: 3, max: 8 };

const README = `# temp-tower

Empty project; the brief lives in the kickstart prompt.
`;

export function createSandbox(dir = DEFAULT_DIR) {
  return createGitSandbox(dir, [{ files: { "README.md": README }, message: "chore: initial readme", date: "2025-01-10T10:00:00" }]);
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mentions = (text, word) => new RegExp(`(^|[^\\w.])${escape(word)}(?![\\w])`, "i").test(text);

// Context may name libraries as domain facts; only the Decision is held to the altitude rule.
export const decisionSection = (adr) => /^## Decision\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(adr)?.[1] ?? "";

const listFiles = (dir, pattern) => (existsSync(dir) ? readdirSync(dir).filter((f) => pattern.test(f)) : []);

function claudeMdFailures(dir) {
  const claude = join(dir, "CLAUDE.md");
  const stat = lstatSync(claude, { throwIfNoEntry: false });
  if (!stat) return ["CLAUDE.md is missing"];
  if (stat.isSymbolicLink()) {
    const target = readlinkSync(claude);
    return target === "AGENTS.md" ? [] : [`CLAUDE.md links to ${target}, expected AGENTS.md`];
  }
  // The skill's fallback when `ln` fails.
  return readFileSync(claude, "utf-8").trim() === "@AGENTS.md" ? [] : ["CLAUDE.md is neither a symlink to AGENTS.md nor an @AGENTS.md pointer"];
}

export function checkSandbox(dir = DEFAULT_DIR) {
  const failures = [];
  const base = readFileSync(join(dir, ".git", "sandbox-base"), "utf-8").trim();
  if (git(dir, ["rev-parse", "HEAD"]) !== base) failures.push("a commit was made; kickstart must never commit");

  for (const path of ["docs/evaluation.md", "docs/overview.md", "AGENTS.md"]) {
    if (!existsSync(join(dir, path))) failures.push(`${path} is missing`);
  }
  const evaluation = join(dir, "docs", "evaluation.md");
  if (existsSync(evaluation)) {
    const text = readFileSync(evaluation, "utf-8");
    if (!/^\*\*Feasibility:\*\*\s*(feasible with caveats|feasible|infeasible)\b/m.test(text)) failures.push("docs/evaluation.md has no Feasibility verdict line");
    if (!/^\*\*Build:\*\*\s*(build with changes|build|don't build)\b/m.test(text)) failures.push("docs/evaluation.md has no Build verdict line");
  }

  const adrDir = join(dir, "docs", "adr");
  const adrs = listFiles(adrDir, /^\d{4}-.+\.md$/);
  if (adrs.length === 0) failures.push("no ADR files in docs/adr/ (expected NNNN-<slug>.md)");
  for (const adr of adrs) {
    const text = readFileSync(join(adrDir, adr), "utf-8");
    const leaked = DENY_LIST.filter((word) => mentions(decisionSection(text), word));
    if (leaked.length) failures.push(`docs/adr/${adr} Decision names a library or framework: ${leaked.join(", ")}`);
    if (!/^\*\*Status:\*\*\s*accepted\b/m.test(text)) failures.push(`docs/adr/${adr} is not accepted`);
  }

  failures.push(...claudeMdFailures(dir));

  const pendingDir = join(dir, ".backlog", "tasks", "pending");
  const tasks = listFiles(pendingDir, /^TSK-\d+.*\.md$/);
  if (tasks.length < TASK_RANGE.min || tasks.length > TASK_RANGE.max) {
    failures.push(`${tasks.length} tasks in .backlog/tasks/pending/, expected ${TASK_RANGE.min}-${TASK_RANGE.max}`);
  }
  const linked = tasks.filter((task) => /^depends-on:\s*\[\s*TSK-/m.test(readFileSync(join(pendingDir, task), "utf-8")));
  if (tasks.length > 0 && linked.length === 0) failures.push("no seeded task has a depends-on link");

  const changed = git(dir, ["status", "--porcelain", "--untracked-files=all"]).split("\n").filter(Boolean);
  return { ok: failures.length === 0, failures, changed };
}

function printExpectations() {
  console.log(`Expected (the prompt auto-accepts every round and checkpoint):
  evaluation  docs/evaluation.md with Feasibility and Build verdicts; names OrcaSlicer's native temperature tower generator (WebSearch results vary: check by eye)
  ADRs        docs/adr/0001-….md onward, status accepted, no deny-listed library in any Decision
  docs        AGENTS.md, CLAUDE.md -> AGENTS.md (symlink or @AGENTS.md pointer), docs/overview.md
  review      flowstate:kickstart-reviewer findings shown (by eye: it read the templates file)
  tasks       ${TASK_RANGE.min}-${TASK_RANGE.max} tasks in .backlog/tasks/pending/, at least one depends-on link; task 1 tests the riskiest assumption (by eye)
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
      passMessage: "no commit, evaluation with both verdicts, accepted ADRs with clean Decisions, AGENTS.md + overview, CLAUDE.md linked, 3-8 linked tasks",
      mode: process.argv[2],
    }),
  );
}
