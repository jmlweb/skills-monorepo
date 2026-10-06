import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Spawns the compiled CLI: run `pnpm build` first or this tests stale code.
const BIN = fileURLToPath(
  new URL("../../dist/bin/atlassian-polish.js", import.meta.url),
);

function run(args: string[], input: string) {
  return spawnSync("node", [BIN, ...args], { input, encoding: "utf-8" });
}

describe("atlassian-polish CLI", () => {
  it("md-to-adf reads stdin and prints compact ADF JSON", () => {
    const r = run(["md-to-adf"], "## Hi\n\n- [ ] a\n");
    expect(r.status).toBe(0);
    const doc = JSON.parse(r.stdout);
    expect(doc.type).toBe("doc");
    expect(doc.content.map((n: { type: string }) => n.type)).toEqual([
      "heading",
      "taskList",
    ]);
    expect(r.stdout.trim().split("\n")).toHaveLength(1);
  });

  it("exits 2 with an actionable message on unconvertible input", () => {
    const r = run(["md-to-adf"], "```\nunclosed");
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("unclosed code fence");
  });

  it("md-to-adf links keys with --jira-base and --projects", () => {
    const r = run(
      ["md-to-adf", "--jira-base", "https://acme.atlassian.net", "--projects", "PROJ"],
      "See PROJ-1\n",
    );
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout).content[0].content[1]).toEqual({
      type: "inlineCard",
      attrs: { url: "https://acme.atlassian.net/browse/PROJ-1" },
    });
  });

  it("exits 2 when --jira-base comes without --projects", () => {
    const r = run(["md-to-adf", "--jira-base", "https://acme.atlassian.net"], "x");
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("must be used together");
  });

  it("exits 2 on an unknown command", () => {
    expect(run(["nope"], "").status).toBe(2);
  });
});
