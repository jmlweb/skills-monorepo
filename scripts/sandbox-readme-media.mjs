#!/usr/bin/env node
// Live test harness for /dev-workflow:readme-media. The acceptance target is
// plugins/flowstate's README, so the sandbox is a throwaway workspace root
// holding a loadable copy of that plugin (skills, manifest, compiled CLI): the skill
// must pick the sub-project, record a GIF of its slash commands in a live
// claude session into its docs/media/ and embed it, without touching the real
// repo. Needs vhs, ttyd, ffmpeg and claude on PATH.
//
//   pnpm sandbox:readme-media          build, fresh sandbox, open Claude, check
//   pnpm sandbox:readme-media setup    fresh sandbox only
//   pnpm sandbox:readme-media check    re-check the current sandbox
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createGitSandbox, git, ROOT, runHarness, sandboxDir } from "./sandbox-lib.mjs";

export const DEFAULT_DIR = sandboxDir("readme-media");
export const PROJECT = "plugins/flowstate";
export const MAX_GIF_BYTES = 2 * 1024 * 1024;
const MEDIA = `${PROJECT}/docs/media`;
const BASE_FILE = join(".git", "sandbox-base");

const ROOT_FILES = {
  "package.json": `{ "name": "readme-media-sandbox", "private": true, "type": "module" }\n`,
  "pnpm-workspace.yaml": `packages:\n  - "plugins/*"\n`,
  "README.md": "# Sandbox marketplace\n\nPlugins live under `plugins/`.\n",
};

// The skills, hooks and manifest come along so `claude --plugin-dir` can load the copy.
const PROJECT_FILES = ["README.md", "package.json", "SKILL.md", ".claude-plugin", "skills", "shared", "agents", "hooks", "references", "dist"];

// The plugin copy is read from the repo, so the sandbox shows the current CLI.
function projectFiles() {
  const files = {};
  const collect = (relative) => {
    const absolute = join(ROOT, PROJECT, relative);
    if (statSync(absolute).isDirectory()) {
      for (const name of readdirSync(absolute)) collect(join(relative, name));
    } else {
      files[join(PROJECT, relative)] = { content: readFileSync(absolute), mode: statSync(absolute).mode };
    }
  };
  PROJECT_FILES.forEach(collect);
  return files;
}

export function createSandbox(dir = DEFAULT_DIR) {
  return createGitSandbox(dir, [
    {
      files: { ...ROOT_FILES, ...projectFiles() },
      message: "chore: sandbox workspace with a copy of flowstate",
      date: "2026-01-10T10:00:00",
    },
  ]);
}

function changedPaths(dir) {
  // -uall lists every untracked file, not just the new directory.
  return git(dir, ["status", "--porcelain", "-uall"]).split("\n").filter(Boolean).map((line) => line.slice(3));
}

function mediaFiles(dir) {
  try {
    return readdirSync(join(dir, MEDIA));
  } catch {
    return [];
  }
}

// The skill applies the README edit and leaves the media untracked for the
// user to review: no commit, nothing staged, nothing outside the doc and its media.
export function checkSandbox(dir = DEFAULT_DIR) {
  const failures = [];
  const base = readFileSync(join(dir, BASE_FILE), "utf-8").trim();
  if (git(dir, ["rev-parse", "HEAD"]) !== base) failures.push("a commit was made; the skill must never commit");
  const staged = git(dir, ["diff", "--cached", "--name-only"]);
  if (staged) failures.push(`files are staged: ${staged.split("\n").join(", ")}`);
  const changed = changedPaths(dir);
  const outside = changed.filter((path) => path !== `${PROJECT}/README.md` && !path.startsWith(`${MEDIA}/`));
  if (outside.length) failures.push(`files outside ${PROJECT}/README.md and ${MEDIA}/ changed: ${outside.join(", ")}`);

  const files = mediaFiles(dir);
  const gifs = files.filter((name) => name.endsWith(".gif"));
  if (!gifs.length) failures.push(`no GIF in ${MEDIA}/`);
  if (gifs.length && !files.some((name) => name.endsWith(".tape"))) failures.push(`no .tape next to the GIF in ${MEDIA}/`);
  const readme = readFileSync(join(dir, PROJECT, "README.md"), "utf-8");
  for (const gif of gifs) {
    const path = join(dir, MEDIA, gif);
    if (readFileSync(path).subarray(0, 4).toString("latin1") !== "GIF8") failures.push(`not a GIF: ${gif}`);
    if (statSync(path).size > MAX_GIF_BYTES) failures.push(`GIF over ${MAX_GIF_BYTES} bytes: ${gif}`);
    if (!readme.includes(`docs/media/${gif}`)) failures.push(`README does not embed docs/media/${gif}`);
  }
  return { ok: failures.length === 0, failures, changed };
}

function printExpectations() {
  console.log(`Expected run (answer the skill's questions as the user):
  1. Detects a workspace root with no bin and lists ${PROJECT} as a Claude Code plugin; pick it.
  2. Proposes 2-5 shots of /flowstate:* slash commands in a live claude session, with the answers it types.
  3. Checks vhs, ttyd, ffmpeg and claude with command -v and installs nothing.
  4. Records in a scratch dir (hidden flowstate setup never runs inside the sandbox tree).
  5. Shows the README diff with the GIF embed; approve it.
  Pass: a GIF (under 2 MB) and its .tape in ${MEDIA}/, embedded in the README, nothing committed or staged.
`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(
    runHarness({
      pluginName: "dev-workflow",
      skill: "readme-media",
      dir: DEFAULT_DIR,
      create: createSandbox,
      check: checkSandbox,
      printExpectations,
      passMessage: "GIF and tape in docs/media, README embeds it, nothing committed or staged",
      mode: process.argv[2],
    }),
  );
}
