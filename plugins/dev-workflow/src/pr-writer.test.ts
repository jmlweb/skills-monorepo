import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname;

const read = (file: string): Promise<string> =>
  readFile(join(root, file), "utf-8");

const section = (content: string, heading: string): string => {
  const start = content.indexOf(`\n${heading}\n`);
  if (start === -1) throw new Error(`missing section: ${heading}`);
  const rest = content.slice(start + heading.length + 2);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
};

// pr-writer only sees what the skills gather, so a diagram can only be as good as the
// hunks it is given; "a few" let the two skills drift apart.
const HUNK_CAP = /hunks of at most (\d+) files/;

describe("pr-writer diagrams", () => {
  it("style guide defines when, where, shape and safe syntax for diagrams", async () => {
    const diagrams = section(
      await read("references/pr-style-guide.md"),
      "## Diagrams",
    );
    for (const part of ["When", "Where", "Shape", "Safe syntax"]) {
      expect(diagrams).toContain(`**${part}:**`);
    }
    expect(diagrams).toContain("```mermaid");
  });

  it("self-check and things to leave out cover diagrams", async () => {
    const guide = await read("references/pr-style-guide.md");
    expect(section(guide, "## Self-check before replying")).toMatch(/diagram/i);
    expect(section(guide, "## Things to leave out")).toMatch(/diagram/i);
  });

  it("agent decides on a diagram and honours a user veto", async () => {
    const steps = section(await read("agents/pr-writer.md"), "## How to write");
    expect(steps).toMatch(/Diagrams/);
    expect(steps).toMatch(/no diagram/i);
  });

  it("open-pr and pr-ready gather hunks under the same numeric cap", async () => {
    const caps = await Promise.all(
      ["skills/open-pr/SKILL.md", "skills/pr-ready/SKILL.md"].map(
        async (file) => (await read(file)).match(HUNK_CAP)?.[1],
      ),
    );
    expect(caps[0]).toBeDefined();
    expect(caps[1]).toBe(caps[0]);
  });

  it("README /open-pr section mentions the diagram", async () => {
    const openPr = section(
      await read("README.md"),
      "### 🚀 `/open-pr` — Open a PR people want to read",
    );
    expect(openPr).toMatch(/Mermaid diagram/);
  });
});
