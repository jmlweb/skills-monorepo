import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./check-version-consistency.mjs", import.meta.url));

let sandbox;

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), "version-consistency-"));
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function seed({ pkg, plugin, marketplace, skill }) {
  const root = join(sandbox, "plugins", "alpha");
  mkdirSync(join(root, ".claude-plugin"), { recursive: true });
  mkdirSync(join(sandbox, ".claude-plugin"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "alpha", version: pkg }));
  writeFileSync(join(root, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "alpha", version: plugin }));
  writeFileSync(
    join(sandbox, ".claude-plugin", "marketplace.json"),
    JSON.stringify({ plugins: [{ name: "alpha", version: marketplace }] })
  );
  if (skill) writeFileSync(join(root, "SKILL.md"), `---\nname: alpha\nversion: ${skill}\n---\nbody\n`);
}

function run() {
  return spawnSync("node", [script, sandbox], { encoding: "utf-8" });
}

test("passes when all locations carry the same version", () => {
  seed({ pkg: "1.2.0", plugin: "1.2.0", marketplace: "1.2.0", skill: "1.2.0" });
  const res = run();
  assert.equal(res.status, 0);
  assert.match(res.stdout, /consistent/);
});

test("passes for a plugin without SKILL.md", () => {
  seed({ pkg: "1.0.0", plugin: "1.0.0", marketplace: "1.0.0" });
  assert.equal(run().status, 0);
});

for (const location of ["pkg", "plugin", "marketplace", "skill"]) {
  test(`fails with a pnpm bump hint when only ${location} is hand-edited`, () => {
    const versions = { pkg: "1.2.0", plugin: "1.2.0", marketplace: "1.2.0", skill: "1.2.0" };
    seed({ ...versions, [location]: "1.3.0" });
    const res = run();
    assert.equal(res.status, 1);
    assert.match(res.stderr, /pnpm bump/);
    assert.match(res.stderr, /alpha/);
    assert.match(res.stderr, /1\.3\.0/);
  });
}

test("passes when every location is bumped together", () => {
  seed({ pkg: "1.3.0", plugin: "1.3.0", marketplace: "1.3.0", skill: "1.3.0" });
  assert.equal(run().status, 0);
});
