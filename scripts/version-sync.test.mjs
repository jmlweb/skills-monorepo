import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = fileURLToPath(new URL(".", import.meta.url));

let sandbox;

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), "version-sync-"));
  mkdirSync(join(sandbox, "scripts"), { recursive: true });
  mkdirSync(join(sandbox, ".claude-plugin"), { recursive: true });
  mkdirSync(join(sandbox, "plugins"), { recursive: true });
  cpSync(join(scriptsDir, "version-sync.js"), join(sandbox, "scripts", "version-sync.js"));
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function seedPlugin(name, version) {
  const dir = join(sandbox, "plugins", name, ".claude-plugin");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "plugin.json"),
    JSON.stringify({ name, version }, null, 2) + "\n"
  );
}

function seedMarketplace(entries) {
  writeFileSync(
    join(sandbox, ".claude-plugin", "marketplace.json"),
    JSON.stringify({ name: "test", plugins: entries }, null, 2) + "\n"
  );
}

function run() {
  return execFileSync("node", [join(sandbox, "scripts", "version-sync.js")], {
    cwd: sandbox,
    encoding: "utf-8",
  });
}

function readMarketplace() {
  return JSON.parse(readFileSync(join(sandbox, ".claude-plugin", "marketplace.json"), "utf-8"));
}

test("syncs marketplace.json when plugin versions change", () => {
  seedPlugin("alpha", "1.2.3");
  seedMarketplace([{ name: "alpha", source: "./plugins/alpha", version: "1.0.0" }]);

  const out = run();
  assert.match(out, /alpha.*1\.0\.0.*1\.2\.3/);
  assert.equal(readMarketplace().plugins[0].version, "1.2.3");
});

test("is a no-op when all versions already match", () => {
  seedPlugin("alpha", "1.0.0");
  seedMarketplace([{ name: "alpha", source: "./plugins/alpha", version: "1.0.0" }]);

  const out = run();
  assert.match(out, /in sync/);
  assert.equal(readMarketplace().plugins[0].version, "1.0.0");
});

test("handles multiple plugins with mixed states", () => {
  seedPlugin("alpha", "1.1.0");
  seedPlugin("beta", "2.0.0");
  seedMarketplace([
    { name: "alpha", source: "./plugins/alpha", version: "1.0.0" },
    { name: "beta", source: "./plugins/beta", version: "2.0.0" },
  ]);

  run();
  const market = readMarketplace();
  assert.equal(market.plugins.find((p) => p.name === "alpha").version, "1.1.0");
  assert.equal(market.plugins.find((p) => p.name === "beta").version, "2.0.0");
});

test("warns when a plugin is missing from marketplace.json", () => {
  seedPlugin("alpha", "1.0.0");
  seedPlugin("ghost", "1.0.0");
  seedMarketplace([{ name: "alpha", source: "./plugins/alpha", version: "1.0.0" }]);

  const result = spawnSync("node", [join(sandbox, "scripts", "version-sync.js")], {
    cwd: sandbox,
    encoding: "utf-8",
  });
  const combined = `${result.stdout}${result.stderr}`;
  assert.match(combined, /ghost.*not found/);
});

test("ignores plugin directories without plugin.json", () => {
  mkdirSync(join(sandbox, "plugins", "halfbaked"), { recursive: true });
  seedPlugin("alpha", "1.0.0");
  seedMarketplace([{ name: "alpha", source: "./plugins/alpha", version: "1.0.0" }]);

  assert.doesNotThrow(() => run());
});

test("fails loudly with the offending file path when JSON is malformed", () => {
  seedMarketplace([]);
  const brokenDir = join(sandbox, "plugins", "broken", ".claude-plugin");
  mkdirSync(brokenDir, { recursive: true });
  writeFileSync(join(brokenDir, "plugin.json"), "{ not json ");

  try {
    execFileSync("node", [join(sandbox, "scripts", "version-sync.js")], {
      cwd: sandbox,
      encoding: "utf-8",
    });
    assert.fail("should have thrown");
  } catch (err) {
    const stderr = String(err.stderr ?? "");
    assert.match(stderr, /broken.*plugin\.json/);
  }
});
