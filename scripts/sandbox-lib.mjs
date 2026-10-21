// Shared plumbing for live skill-test harnesses (scripts/sandbox-<skill>.mjs).
// A harness supplies the fixture and its skill-specific invariants; this file
// owns the throwaway git repo, the generic "skill left the tree clean" checks
// and the build → sandbox → `claude --plugin-dir` → check flow.
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_FILE = join(".git", "sandbox-base");

export const sandboxDir = (name) => join(tmpdir(), "skills-monorepo-sandboxes", name);

export function git(dir, args, env = {}) {
  return execFileSync(
    "git",
    ["-c", "user.name=sandbox", "-c", "user.email=sandbox@example.invalid", "-c", "commit.gpgsign=false", ...args],
    { cwd: dir, encoding: "utf-8", env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] },
  ).trimEnd(); // porcelain lines start with a meaningful space
}

// A value is the file's content, or { content, mode } when the copy must keep
// its executable bit (plugin hooks fail with "Permission denied" otherwise).
export function writeFiles(dir, files) {
  for (const [path, value] of Object.entries(files)) {
    const { content, mode } = typeof value === "object" && "content" in value ? value : { content: value };
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
    if (mode !== undefined) chmodSync(join(dir, path), mode);
  }
}

// One commit per entry, in order; an entry with `branch` first switches to
// that branch (created from the current HEAD). Dates are explicit so fixtures
// can plant "stale" history deterministically. HEAD after the last commit is
// recorded as the base that `gitInvariantFailures` compares against.
export function createGitSandbox(dir, commits) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  git(dir, ["init", "-q", "-b", "main"]);
  for (const { files, message, date, branch } of commits) {
    if (branch) git(dir, ["checkout", "-q", "-B", branch]);
    writeFiles(dir, files);
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", message], { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
  }
  const head = git(dir, ["rev-parse", "HEAD"]);
  writeFileSync(join(dir, BASE_FILE), head);
  return head;
}

// Generic invariants for a skill that edits the working tree but must not
// commit, stage or leave scratch files. `allowedPrefix` limits which paths it
// may touch (e.g. "test/").
export function gitInvariantFailures(dir, { allowedPrefix = "" } = {}) {
  const failures = [];
  const base = readFileSync(join(dir, BASE_FILE), "utf-8").trim();
  if (git(dir, ["rev-parse", "HEAD"]) !== base) failures.push("a commit was made; the skill must never commit");
  const staged = git(dir, ["diff", "--cached", "--name-only"]);
  if (staged) failures.push(`files are staged: ${staged.split("\n").join(", ")}`);
  const status = git(dir, ["status", "--porcelain"]).split("\n").filter(Boolean);
  const untracked = status.filter((line) => line.startsWith("??")).map((line) => line.slice(3));
  if (untracked.length) failures.push(`untracked files left behind: ${untracked.join(", ")}`);
  const outside = status.map((line) => line.slice(3)).filter((path) => !path.startsWith(allowedPrefix));
  if (outside.length) failures.push(`files outside ${allowedPrefix || "the allowed paths"} changed: ${outside.join(", ")}`);
  return { failures, changed: status };
}

export function suiteFailures(dir, command = ["node", "--test"]) {
  const [bin, ...args] = command;
  const run = spawnSync(bin, args, { cwd: dir, encoding: "utf-8" });
  return run.status === 0 ? [] : [`suite fails after the changes (${command.join(" ")})`];
}

export function printCheck(result, passMessage) {
  console.log(`\nChanged files:\n${result.changed.map((l) => `  ${l}`).join("\n") || "  (none)"}`);
  if (result.ok) {
    console.log(`\nPASS  ${passMessage}`);
  } else {
    console.log(`\nFAIL\n${result.failures.map((f) => `  - ${f}`).join("\n")}`);
  }
}

// Modes: (none) build + fresh sandbox + Claude + check; `setup` sandbox only;
// `check` re-check the current sandbox. `env` adds variables to the Claude
// session only. Returns the process exit code.
export function runHarness({ pluginName, skill, args = "", env = {}, dir, create, check, printExpectations, passMessage, mode }) {
  const pluginDir = join(ROOT, "plugins", pluginName);
  if (mode === "check") {
    const result = check(dir);
    printCheck(result, passMessage);
    return result.ok ? 0 : 1;
  }
  if (mode !== "setup") {
    const build = spawnSync("pnpm", ["build"], { cwd: pluginDir, stdio: "inherit" });
    if (build.status !== 0) return 2;
  }
  create(dir);
  console.log(`Sandbox ready: ${dir}`);
  printExpectations();
  if (mode === "setup") return 0;
  // --plugin-dir loads the source copy; the session would otherwise use the plugin cache (LRN-034).
  spawnSync("claude", ["--plugin-dir", pluginDir, `/${pluginName}:${skill}${args ? ` ${args}` : ""}`], { cwd: dir, stdio: "inherit", env: { ...process.env, ...env } });
  const result = check(dir);
  printCheck(result, passMessage);
  return result.ok ? 0 : 1;
}
