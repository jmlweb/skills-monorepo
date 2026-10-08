import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("readback-to-md restores keys and mentions using --html", () => {
    const dir = mkdtempSync(join(tmpdir(), "ap-"));
    try {
      const html = join(dir, "r.html");
      writeFileSync(html, '<a data-account-id="42">Bo</a>');
      const r = run(
        ["readback-to-md", "--html", html],
        '<custom data-type="smartlink" data-id="id-0">https://acme.atlassian.net/browse/PROJ-1</custom> <custom data-type="mention" data-id="id-1">@Bo</custom>',
      );
      expect(r.status).toBe(0);
      expect(r.stdout).toBe("PROJ-1 [@Bo](mention:42)");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("readback-to-md exits 2 without --html", () => {
    expect(run(["readback-to-md"], "x").status).toBe(2);
  });

  it("lossy-scan exits 1 and lists a panel found in ADF, 0 for plain ADF", () => {
    const dir = mkdtempSync(join(tmpdir(), "ap-"));
    try {
      const adf = join(dir, "a.json");
      writeFileSync(adf, JSON.stringify({ type: "doc", content: [{ type: "panel" }] }));
      const r = run(["lossy-scan", "--adf", adf], "");
      expect(r.status).toBe(1);
      expect(JSON.parse(r.stdout).findings[0].kind).toBe("panel");
      writeFileSync(adf, JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }));
      expect(run(["lossy-scan", "--adf", adf], "").status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("lossy-scan exits 2 without any input flag", () => {
    expect(run(["lossy-scan"], "").status).toBe(2);
  });

  it("exits 2 on an unknown command", () => {
    expect(run(["nope"], "").status).toBe(2);
  });
});
