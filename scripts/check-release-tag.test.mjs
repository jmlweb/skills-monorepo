import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./check-release-tag.mjs", import.meta.url));

let repo;

const git = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" });

function commitVersion(version) {
  mkdirSync(join(repo, "plugins", "demo"), { recursive: true });
  writeFileSync(join(repo, "plugins", "demo", "package.json"), JSON.stringify({ name: "demo", version }) + "\n");
  git("add", "-A");
  git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", `v${version}`);
}

function check(tag) {
  // The local "main" branch stands in for origin/main in the sandbox.
  return spawnSync("node", [script, tag, "--root", repo, "--main-ref", "main"], { encoding: "utf8" });
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "check-release-tag-"));
  git("init", "-q", "-b", "main");
  commitVersion("1.0.0");
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

test("accepts a tag matching package.json on main", () => {
  git("tag", "plugins/demo/v1.0.0");
  const result = check("plugins/demo/v1.0.0");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK/);
});

test("rejects a tag whose version differs from package.json", () => {
  git("tag", "plugins/demo/v1.0.1");
  const result = check("plugins/demo/v1.0.1");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Tag says v1\.0\.1 but plugins\/demo\/package\.json says v1\.0\.0/);
});

test("rejects a tag whose commit is not on main", () => {
  git("checkout", "-q", "-b", "feature");
  commitVersion("1.1.0");
  git("tag", "plugins/demo/v1.1.0");
  // CI checks out the tag itself, so package.json matches and only ancestry can fail.
  const result = check("plugins/demo/v1.1.0");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not on main/);
});

test("accepts an annotated tag on main", () => {
  git("-c", "user.name=t", "-c", "user.email=t@t", "tag", "-a", "-m", "rel", "plugins/demo/v1.0.0");
  assert.equal(check("plugins/demo/v1.0.0").status, 0);
});

test("rejects malformed tag names", () => {
  const result = check("v1.0.0");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /plugins\/<name>\/v<semver>/);
});

test("fails loudly when the plugin package.json is missing", () => {
  git("tag", "plugins/ghost/v1.0.0");
  const result = check("plugins/ghost/v1.0.0");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Cannot read .*ghost.*package\.json/);
});
