#!/usr/bin/env node
// Guards a release tag (plugins/<name>/v<semver>) before CI spends time on
// install/build/test: the tag must match the plugin's package.json version and
// its commit must be reachable from main, so a stray tag on a feature branch
// can never publish a release.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TAG_PATTERN = /^plugins\/([a-z0-9][a-z0-9-]*)\/v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/;

export class ReleaseTagError extends Error {
  constructor(message) {
    super(message);
    this.name = "ReleaseTagError";
  }
}

export function parseTag(tag) {
  const match = TAG_PATTERN.exec(tag ?? "");
  if (!match) {
    throw new ReleaseTagError(
      `Tag "${tag}" does not match plugins/<name>/v<semver> (e.g. plugins/flowstate/v1.2.3).`
    );
  }
  return { plugin: match[1], version: match[2] };
}

export function readPackageVersion(root, plugin) {
  const path = join(root, "plugins", plugin, "package.json");
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    throw new ReleaseTagError(
      `Cannot read ${path} (${error.code ?? error.message}). Does plugin "${plugin}" exist at the tagged commit?`
    );
  }
  let version;
  try {
    version = JSON.parse(raw).version;
  } catch (error) {
    throw new ReleaseTagError(`${path} is not valid JSON: ${error.message}`);
  }
  if (typeof version !== "string" || version === "") {
    throw new ReleaseTagError(`${path} has no "version" field.`);
  }
  return version;
}

export function assertVersionMatches(root, tag) {
  const { plugin, version } = parseTag(tag);
  const pkgVersion = readPackageVersion(root, plugin);
  if (pkgVersion !== version) {
    throw new ReleaseTagError(
      `Tag says v${version} but plugins/${plugin}/package.json says v${pkgVersion}. ` +
        `Fix the version (pnpm bump) and re-tag; no release was created.`
    );
  }
  return { plugin, version };
}

export function assertOnMain(root, tag, mainRef = "origin/main") {
  const run = (args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
  const commit = run(["rev-parse", "--verify", `${tag}^{commit}`]);
  if (commit.status !== 0) {
    throw new ReleaseTagError(`Cannot resolve tag "${tag}": ${commit.stderr.trim()}`);
  }
  const main = run(["rev-parse", "--verify", `${mainRef}^{commit}`]);
  if (main.status !== 0) {
    throw new ReleaseTagError(
      `Cannot resolve "${mainRef}": ${main.stderr.trim()}. Fetch it first (git fetch origin main).`
    );
  }
  // Exit 1 means "not an ancestor"; anything else is a real git failure.
  const ancestry = run(["merge-base", "--is-ancestor", commit.stdout.trim(), main.stdout.trim()]);
  if (ancestry.status === 1) {
    throw new ReleaseTagError(
      `Tag "${tag}" points at ${commit.stdout.trim().slice(0, 7)}, which is not on ${mainRef}. ` +
        `Releases must be tagged from main.`
    );
  }
  if (ancestry.status !== 0) {
    throw new ReleaseTagError(`git merge-base failed: ${ancestry.stderr.trim()}`);
  }
}

function main() {
  const [tag, ...rest] = process.argv.slice(2);
  const flag = (name) => {
    const index = rest.indexOf(name);
    return index === -1 ? undefined : rest[index + 1];
  };
  const root = flag("--root") ?? process.cwd();
  const mainRef = flag("--main-ref") ?? "origin/main";
  try {
    assertVersionMatches(root, tag);
    assertOnMain(root, tag, mainRef);
    console.log(`OK: ${tag} matches package.json and is on ${mainRef}.`);
  } catch (error) {
    if (!(error instanceof ReleaseTagError)) throw error;
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
