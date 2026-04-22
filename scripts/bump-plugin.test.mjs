import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  cpSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = fileURLToPath(new URL(".", import.meta.url));

let sandbox;

function seed(plugin, { withSkill = false, initialVersion = "1.0.0" } = {}) {
  const pluginDir = join(sandbox, "plugins", plugin);
  mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
  writeFileSync(
    join(pluginDir, "package.json"),
    JSON.stringify({ name: `@test/${plugin}`, version: initialVersion }, null, 2) + "\n"
  );
  writeFileSync(
    join(pluginDir, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: plugin, version: initialVersion }, null, 2) + "\n"
  );
  if (withSkill) {
    writeFileSync(
      join(pluginDir, "SKILL.md"),
      `---\nname: ${plugin}\nversion: ${initialVersion}\n---\n\nBody\n`
    );
  }
}

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), "bump-plugin-"));
  mkdirSync(join(sandbox, "scripts"), { recursive: true });
  mkdirSync(join(sandbox, ".claude-plugin"), { recursive: true });
  cpSync(join(scriptsDir, "bump-plugin.sh"), join(sandbox, "scripts", "bump-plugin.sh"));
  cpSync(join(scriptsDir, "version-sync.js"), join(sandbox, "scripts", "version-sync.js"));
  writeFileSync(
    join(sandbox, ".claude-plugin", "marketplace.json"),
    JSON.stringify(
      {
        name: "test",
        plugins: [
          { name: "alpha", source: "./plugins/alpha", version: "1.0.0" },
          { name: "beta", source: "./plugins/beta", version: "1.0.0" },
        ],
      },
      null,
      2
    ) + "\n"
  );
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function runBump(args) {
  return execFileSync("bash", [join(sandbox, "scripts", "bump-plugin.sh"), ...args], {
    cwd: sandbox,
    encoding: "utf-8",
  });
}

function readJSON(rel) {
  return JSON.parse(readFileSync(join(sandbox, rel), "utf-8"));
}

test("bumps package.json, plugin.json and marketplace.json", () => {
  seed("alpha");
  runBump(["alpha", "patch"]);

  assert.equal(readJSON("plugins/alpha/package.json").version, "1.0.1");
  assert.equal(readJSON("plugins/alpha/.claude-plugin/plugin.json").version, "1.0.1");
  const marketplace = readJSON(".claude-plugin/marketplace.json");
  const entry = marketplace.plugins.find((p) => p.name === "alpha");
  assert.equal(entry.version, "1.0.1");
});

test("propagates version to SKILL.md when present", () => {
  seed("beta", { withSkill: true });
  runBump(["beta", "minor"]);

  const skill = readFileSync(join(sandbox, "plugins", "beta", "SKILL.md"), "utf-8");
  assert.match(skill, /^version: 1\.1\.0$/m);
});

test("skips SKILL.md step when file is absent", () => {
  seed("alpha");
  const out = runBump(["alpha", "major"]);

  assert.equal(readJSON("plugins/alpha/package.json").version, "2.0.0");
  assert.doesNotMatch(out, /SKILL\.md/);
});

test("accepts an explicit x.y.z version", () => {
  seed("alpha");
  runBump(["alpha", "3.1.4"]);

  assert.equal(readJSON("plugins/alpha/package.json").version, "3.1.4");
  assert.equal(readJSON("plugins/alpha/.claude-plugin/plugin.json").version, "3.1.4");
});

test("does not touch sibling plugins", () => {
  seed("alpha");
  seed("beta", { initialVersion: "1.0.0" });
  runBump(["alpha", "patch"]);

  assert.equal(readJSON("plugins/beta/package.json").version, "1.0.0");
  assert.equal(readJSON("plugins/beta/.claude-plugin/plugin.json").version, "1.0.0");
});

test("exits with non-zero code when plugin argument is missing", () => {
  assert.throws(() => runBump([]), /Usage/);
});

test("exits with non-zero code when plugin directory does not exist", () => {
  assert.throws(() => runBump(["ghost", "patch"]));
});
