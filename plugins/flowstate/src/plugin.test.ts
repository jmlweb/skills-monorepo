import { describe, it, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
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

// A skill that reads a status folder only works with the file backend. Listing goes
// through task-list, idea-list and report-list, which work against any BacklogStore.
const DIRECTORY_READ =
  /\b(read|scan|check|verify|look in|(find|resolve)[^.\n]*\bin|exists in|every file in)\b[^.\n]*`[^`]*\b(tasks|ideas|reports)\/(pending|active|complete)\/?`/i;

describe("skills", () => {
  it("list tasks, ideas and reports through the CLI, never by reading status folders", async () => {
    const names = await readdir(join(root, "skills"));
    const files = ["SKILL.md", ...names.map((name) => join("skills", name, "SKILL.md"))];
    const offenders: string[] = [];
    for (const file of files) {
      const lines = (await readFile(join(root, file), "utf-8")).split("\n");
      lines.forEach((line, index) => {
        if (DIRECTORY_READ.test(line)) offenders.push(`${file}:${index + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe("parallel skill", () => {
  const collectStep = async () => {
    const skill = await readFile(join(root, "skills/parallel/SKILL.md"), "utf-8");
    return skill.slice(skill.indexOf("### 7. Collect Results"), skill.indexOf("## Error Handling"));
  };

  it("offers to remove each merged worktree and its branch", async () => {
    const step = await collectStep();
    expect(step).toMatch(/merged/i);
    expect(step).toMatch(/\boffer\b/i);
    expect(step).toContain("git worktree remove");
    expect(step).toContain("git branch -d");
    expect(step).toContain("git worktree prune");
  });

  // rtk rewrites and the isolation guard exist only on the author's machine.
  it("keeps machine-specific workarounds out of the published skill", async () => {
    const skill = await readFile(join(root, "skills/parallel/SKILL.md"), "utf-8");
    expect(skill).not.toMatch(/\brtk\b|\bguard\b|\/usr\/bin\/git/i);
  });
});
