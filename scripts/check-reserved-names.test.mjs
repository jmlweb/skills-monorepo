import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./check-reserved-names.mjs", import.meta.url));

let root;

function put(rel, content = "") {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function check() {
  const run = spawnSync("node", [script, root], { encoding: "utf-8" });
  return { status: run.status, out: run.stdout, err: run.stderr };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "reserved-names-test-"));
  put("plugins/demo/src/commands/idea-create.ts", "export const a = 1\n");
  put("plugins/demo/src/commands/idea-create.test.ts", "// test\n");
  put("plugins/demo/dist/commands/idea-create.js", "export const a = 1;\n");
  put("plugins/demo/skills/idea/SKILL.md", "---\nname: idea\n---\n# Idea\n");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

test("passes on a clean plugin", () => {
  const { status, out } = check();
  assert.equal(status, 0);
  assert.match(out, /No reserved names/);
});

test("flags a plan-create reference with file and line", () => {
  put("plugins/demo/skills/idea/SKILL.md", "---\nname: idea\n---\nRun plan-create now\n");
  const { status, err } = check();
  assert.equal(status, 1);
  assert.match(err, /plugins\/demo\/skills\/idea\/SKILL\.md:4: reserved name "plan-create"/);
});

test("flags a skill directory named plan", () => {
  put("plugins/demo/skills/plan/SKILL.md", "---\nname: something\n---\n");
  const { status, err } = check();
  assert.equal(status, 1);
  assert.match(err, /plugins\/demo\/skills\/plan\/SKILL\.md: skill directory "plan" is reserved/);
});

test("flags a skill whose frontmatter name is init", () => {
  put("plugins/demo/skills/setup/SKILL.md", "---\nname: init\n---\n");
  const { status, err } = check();
  assert.equal(status, 1);
  assert.match(err, /plugins\/demo\/skills\/setup\/SKILL\.md: skill frontmatter name "init" is reserved/);
});

test("flags plans/ outside migration code", () => {
  put("plugins/demo/src/commands/idea-create.ts", "const dir = 'plans/pending'\n");
  const { status, err } = check();
  assert.equal(status, 1);
  assert.match(err, /plugins\/demo\/src\/commands\/idea-create\.ts:1: reserved name "plans\/"/);
});

test("does not flag words that merely end in plans/", () => {
  put("plugins/demo/references/notes.md", "see roadmap-plans/ and explans/\n");
  assert.equal(check().status, 0);
});

test("allows plans/ in the flowstate migration files only", () => {
  put("plugins/flowstate/src/commands/setup.ts", "// Migration: rename plans/ -> ideas/\n");
  put("plugins/flowstate/src/commands/setup.test.ts", "// migrates plans/ to ideas/\n");
  put("plugins/flowstate/dist/commands/setup.js", "// Migration: rename plans/ -> ideas/\n");
  const { status, err } = check();
  assert.equal(status, 0, err);

  put("plugins/flowstate/src/commands/other.ts", "// plans/\n");
  put("plugins/flowstate/dist/commands/other.js", "");
  const second = check();
  assert.equal(second.status, 1);
  assert.match(second.err, /plugins\/flowstate\/src\/commands\/other\.ts:1: reserved name "plans\/"/);
});

test("migration allow-list does not excuse plan-create", () => {
  put("plugins/flowstate/src/commands/setup.ts", "// plan-create\n");
  put("plugins/flowstate/dist/commands/setup.js", "");
  const { status, err } = check();
  assert.equal(status, 1);
  assert.match(err, /setup\.ts:1: reserved name "plan-create"/);
});

test("reports a dist file with no matching src module", () => {
  put("plugins/demo/dist/commands/plan-move.js", "");
  const { status, err } = check();
  assert.equal(status, 1);
  assert.match(err, /plugins\/demo\/dist\/commands\/plan-move\.js: no matching plugins\/demo\/src\/commands\/plan-move\.ts/);
});

test("ignores .d.ts and .map files in dist", () => {
  put("plugins/demo/dist/commands/idea-create.d.ts", "");
  put("plugins/demo/dist/commands/idea-create.js.map", "{}");
  assert.equal(check().status, 0);
});

test("test files in src do not count as sources for dist", () => {
  put("plugins/demo/dist/commands/idea-create.test.js", "");
  const { status, err } = check();
  assert.equal(status, 1);
  assert.match(err, /idea-create\.test\.js: no matching/);
});

test("dist without src is reported as stale", () => {
  put("plugins/orphan/dist/bin/cli.js", "");
  const { status, err } = check();
  assert.equal(status, 1);
  assert.match(err, /plugins\/orphan\/dist: exists but plugins\/orphan\/src does not/);
});

test("prompt-only plugin (no src, no dist) passes", () => {
  put("plugins/prompt-only/skills/thing/SKILL.md", "---\nname: thing\n---\n");
  assert.equal(check().status, 0);
});

test("src without dist is an explicit setup error", () => {
  put("plugins/unbuilt/src/index.ts", "export {}\n");
  const { status, err } = check();
  assert.equal(status, 2);
  assert.match(err, /Plugin "unbuilt".*dist.*missing/);
});

test("empty dist is an explicit setup error, not a pass", () => {
  mkdirSync(join(root, "plugins/hollow/src"), { recursive: true });
  put("plugins/hollow/src/index.ts", "export {}\n");
  mkdirSync(join(root, "plugins/hollow/dist"), { recursive: true });
  const { status, err } = check();
  assert.equal(status, 2);
  assert.match(err, /Plugin "hollow": no \.js files/);
});

test("missing plugins directory is an explicit error", () => {
  rmSync(join(root, "plugins"), { recursive: true });
  const { status, err } = check();
  assert.equal(status, 2);
  assert.match(err, /No plugins directory/);
});
