import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lintRepo, parseFrontmatter, parseHelpCommands } from "./lint-skills.mjs";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");

let sandbox;

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), "lint-skills-"));
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

const GOOD_DESCRIPTION =
  'Does a thing. Use when the user says "do it", "run it", or "go". Not for X.';

function frontmatter(fields) {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

function write(rel, content) {
  const path = join(sandbox, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/** Seeds plugin "demo" with one skill, a README row and a fake CLI; overrides tweak the skill. */
function seed({ fields = {}, body = "# Demo\n", readme, skillName = "alpha", cliCommands = ["do-it"] } = {}) {
  const base = {
    name: skillName,
    description: GOOD_DESCRIPTION,
    model: "haiku",
    ...fields,
  };
  write(`plugins/demo/skills/${skillName}/SKILL.md`, frontmatter(base) + body);
  write("plugins/demo/README.md", readme ?? `| Command | Description |\n|---|---|\n| \`/demo:${skillName}\` | x |\n`);
  const help = `Usage: demo <command>\n\nCommands:\n${cliCommands
    .map((c) => `  ${c}   Does ${c}\n                    wrapped continuation`)
    .join("\n")}\n\nGlobal flags:\n  --help  Show help\n`;
  write("plugins/demo/dist/bin/demo.js", `process.stderr.write(${JSON.stringify(help)});\n`);
}

const rules = (findings) => findings.map((f) => f.rule);

test("a conforming skill produces no findings", () => {
  seed({ body: "# Demo\n\nRun `node \"${CLAUDE_PLUGIN_ROOT}/dist/bin/demo.js\" do-it`.\n" });
  assert.deepEqual(lintRepo(sandbox), []);
});

test("parseFrontmatter reads flat keys and flags continuation lines", () => {
  const parsed = parseFrontmatter("---\nname: a\ndescription: >\n  folded\nmodel: haiku\n---\nbody\n");
  assert.equal(parsed.fields.model, "haiku");
  assert.ok(parsed.multiline.has("description"));
  assert.equal(parseFrontmatter("no frontmatter"), null);
  assert.equal(parseFrontmatter("---\nname: a\n"), null);
});

test("parseHelpCommands ignores wrapped lines and other sections", () => {
  const help = "Usage: x\n\nCommands:\n  one   First\n  two-b Second\n                wrapped\n\nFlags:\n  three  nope\n";
  assert.deepEqual(parseHelpCommands(help), ["one", "two-b"]);
});

test("frontmatter-unreadable: error when the block is missing", () => {
  seed();
  write("plugins/demo/skills/alpha/SKILL.md", "# no frontmatter\n");
  assert.deepEqual(rules(lintRepo(sandbox)), ["frontmatter-unreadable"]);
});

test("skill-missing: error for a skill directory without SKILL.md", () => {
  seed();
  mkdirSync(join(sandbox, "plugins/demo/skills/empty"), { recursive: true });
  const findings = lintRepo(sandbox);
  assert.ok(findings.some((f) => f.rule === "skill-missing" && f.severity === "error"));
});

test("name-matches-dir: passes for matching name, errors on mismatch, root exempt", () => {
  seed();
  assert.equal(rules(lintRepo(sandbox)).includes("name-matches-dir"), false);
  seed({ fields: { name: "beta" } });
  assert.ok(lintRepo(sandbox).some((f) => f.rule === "name-matches-dir" && f.severity === "error"));
  write("plugins/demo/SKILL.md", frontmatter({ name: "demo-root", description: "Root context.", version: "1.0.0" }));
  const rootFindings = lintRepo(sandbox).filter((f) => f.file === "plugins/demo/SKILL.md");
  assert.equal(rootFindings.some((f) => f.rule === "name-matches-dir"), false);
});

test("frontmatter-keys: allowlist enforced, version only on the root skill", () => {
  seed({ fields: { "disable-model-invocation": "true", "argument-hint": "[x]", "allowed-tools": "Read" } });
  assert.equal(rules(lintRepo(sandbox)).includes("frontmatter-keys"), false);
  seed({ fields: { version: "1.0.0", bogus: "1" } });
  const messages = lintRepo(sandbox).filter((f) => f.rule === "frontmatter-keys").map((f) => f.message);
  assert.equal(messages.length, 2);
  write("plugins/demo/SKILL.md", frontmatter({ name: "root", description: "Root.", version: "1.0.0" }));
  const rootKeyFindings = lintRepo(sandbox).filter((f) => f.file === "plugins/demo/SKILL.md" && f.rule === "frontmatter-keys");
  assert.deepEqual(rootKeyFindings, []);
});

test("description-length: errors above 1024 chars", () => {
  seed({ fields: { description: `${GOOD_DESCRIPTION} ${"x".repeat(1100)}` } });
  assert.ok(lintRepo(sandbox).some((f) => f.rule === "description-length" && f.severity === "error"));
});

test("description-single-line: errors on folded scalars", () => {
  seed();
  write(
    "plugins/demo/skills/alpha/SKILL.md",
    `---\nname: alpha\ndescription: >\n  ${GOOD_DESCRIPTION}\nmodel: haiku\n---\n# Demo\n`,
  );
  assert.ok(lintRepo(sandbox).some((f) => f.rule === "description-single-line" && f.severity === "error"));
});

test("description-triggers: warns below three phrases, exempt with disable-model-invocation", () => {
  seed({ fields: { description: 'Does a thing. Use when the user says "do it" or "run it".' } });
  const warn = lintRepo(sandbox).filter((f) => f.rule === "description-triggers");
  assert.equal(warn.length, 1);
  assert.equal(warn[0].severity, "warn");
  seed({ fields: { description: "Does a thing.", "disable-model-invocation": "true" } });
  assert.equal(rules(lintRepo(sandbox)).includes("description-triggers"), false);
});

test("body-length: warns above 150 lines", () => {
  seed({ body: `${"line\n".repeat(150)}` });
  assert.equal(rules(lintRepo(sandbox)).includes("body-length"), false);
  seed({ body: `${"line\n".repeat(151)}` });
  const warn = lintRepo(sandbox).filter((f) => f.rule === "body-length");
  assert.equal(warn.length, 1);
  assert.equal(warn[0].severity, "warn");
});

test("model-tier: haiku forbids effort, sonnet requires medium or high", () => {
  seed({ fields: { model: "sonnet", effort: "medium" } });
  assert.deepEqual(lintRepo(sandbox), []);
  seed({ fields: { model: "sonnet", effort: "high" } });
  assert.deepEqual(lintRepo(sandbox), []);
  seed({ fields: { model: "haiku", effort: "low" } });
  assert.deepEqual(rules(lintRepo(sandbox)), ["model-tier"]);
  seed({ fields: { model: "sonnet" } });
  assert.deepEqual(rules(lintRepo(sandbox)), ["model-tier"]);
  seed({ fields: { model: "sonnet", effort: "low" } });
  assert.deepEqual(rules(lintRepo(sandbox)), ["model-tier"]);
});

test("plugin-root-path: warns on bare shared/ references, accepts prefixed ones", () => {
  seed({ body: "Read ${CLAUDE_PLUGIN_ROOT}/shared/basics.md first.\n" });
  assert.deepEqual(lintRepo(sandbox), []);
  seed({ body: "Read shared/basics.md first.\n" });
  const warn = lintRepo(sandbox).filter((f) => f.rule === "plugin-root-path");
  assert.equal(warn.length, 1);
  assert.equal(warn[0].severity, "warn");
  seed({ body: "Prefix: ${CLAUDE_PLUGIN_ROOT}/references/\nThen read references/style.md.\n" });
  assert.deepEqual(lintRepo(sandbox), []);
});

test("cli-contract: errors on unknown subcommands and unbuilt binaries", () => {
  seed({ body: 'node "${CLAUDE_PLUGIN_ROOT}/dist/bin/demo.js" do-it\n' });
  assert.deepEqual(lintRepo(sandbox), []);
  seed({ body: 'node "${CLAUDE_PLUGIN_ROOT}/dist/bin/demo.js" renamed-cmd\n' });
  const unknown = lintRepo(sandbox);
  assert.deepEqual(rules(unknown), ["cli-contract"]);
  assert.equal(unknown[0].severity, "error");
  seed({ body: 'node "${CLAUDE_PLUGIN_ROOT}/dist/bin/ghost.js" do-it\n' });
  assert.deepEqual(rules(lintRepo(sandbox)), ["cli-contract"]);
});

test("readme-drift: errors for unlisted skills and for mentions without a skill", () => {
  seed();
  assert.deepEqual(lintRepo(sandbox), []);
  seed({ readme: "| Command | Description |\n|---|---|\n| `/demo:other` | x |\n" });
  const messages = lintRepo(sandbox).map((f) => f.message);
  assert.equal(messages.length, 2);
  assert.ok(messages.some((m) => m.includes('"alpha"')));
  assert.ok(messages.some((m) => m.includes("/demo:other")));
});

test("readme-drift: accepts bare /name headings and ignores prose and description cells", () => {
  seed({ readme: "### `/alpha` — Alpha\n\nSee `/unrelated` in prose.\n\n| Skill | Note |\n|---|---|\n| `/alpha` | try `/clear` |\n" });
  assert.deepEqual(lintRepo(sandbox), []);
});

test("--strict promotes warnings to errors", () => {
  seed({ body: `${"line\n".repeat(151)}` });
  assert.equal(lintRepo(sandbox)[0].severity, "warn");
  assert.equal(lintRepo(sandbox, { strict: true })[0].severity, "error");
});

test("the real repo has zero errors, and the CLI exits 0 in default mode", () => {
  const errors = lintRepo(repoRoot).filter((f) => f.severity === "error");
  assert.deepEqual(errors, []);
  const run = spawnSync(process.execPath, [join(repoRoot, "scripts", "lint-skills.mjs")], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});
