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

  it("exits 2 on an unknown command", () => {
    expect(run(["nope"], "").status).toBe(2);
  });
});
