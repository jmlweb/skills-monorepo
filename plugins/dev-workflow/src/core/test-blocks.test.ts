import { describe, expect, it } from "vitest";
import { extractTestBlocks } from "./test-blocks.js";

describe("extractTestBlocks", () => {
  it("reads title, line and callback body", () => {
    const src = `describe("x", () => {\n  it("adds numbers", () => {\n    expect(1 + 1).toBe(2);\n  });\n});`;
    const [block] = extractTestBlocks(src);
    expect(block?.name).toBe("adds numbers");
    expect(block?.line).toBe(2);
    expect(block?.body?.trim()).toBe("expect(1 + 1).toBe(2);");
  });

  it("does not match a later test when a callback is a bare identifier", () => {
    const src = `it("first", handler);\nit("second", () => { expect(1).toBe(1); });`;
    const blocks = extractTestBlocks(src);
    expect(blocks[0]?.body).toBeNull();
    expect(blocks[1]?.body?.trim()).toBe("expect(1).toBe(1);");
  });

  it("marks skipped, todo and parameterised tests", () => {
    const src = [
      `it.skip("a", () => {});`,
      `xit("b", () => {});`,
      `test.todo("c");`,
      `it.each([1, 2])("d %s", (n) => { expect(n).toBeGreaterThan(0); });`,
    ].join("\n");
    const blocks = extractTestBlocks(src);
    expect(blocks.map((b) => [b.name, b.skipped, b.todo, b.parameterised])).toEqual([
      ["a", true, false, false],
      ["b", true, false, false],
      ["c", false, true, false],
      ["d %s", false, false, true],
    ]);
  });

  it("reads node:test skip options", () => {
    const src = `test("e", { skip: true }, () => { assert.ok(1); });`;
    expect(extractTestBlocks(src)[0]?.skipped).toBe(true);
  });

  it("ignores brackets inside strings and comments", () => {
    const src = `it("braces", () => {\n  // } not the end\n  const s = "}";\n  expect(s).toBe("}");\n});`;
    const [block] = extractTestBlocks(src);
    expect(block?.body).toContain('expect(s).toBe("}");');
  });

  it("skips method calls that only look like test calls", () => {
    expect(extractTestBlocks(`harness.test("x", () => {});`)).toHaveLength(0);
  });
});
