import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname;

function parseSkillVersion(content: string): string | undefined {
  const match = content.match(/^version:\s*(.+)$/m);
  return match?.[1].trim();
}

describe("plugin manifest", () => {
  it("plugin.json and SKILL.md versions match package.json", async () => {
    const [pkg, plugin, skill] = await Promise.all([
      readFile(join(root, "package.json"), "utf-8").then(JSON.parse),
      readFile(join(root, ".claude-plugin/plugin.json"), "utf-8").then(
        JSON.parse,
      ),
      readFile(join(root, "SKILL.md"), "utf-8"),
    ]);
    expect(plugin.version).toBe(pkg.version);
    expect(parseSkillVersion(skill)).toBe(pkg.version);
  });
});
