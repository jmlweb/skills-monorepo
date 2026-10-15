import { describe, expect, it } from "vitest";
import { countAssertionCalls, parsePassedCount } from "./test-output.js";

describe("parsePassedCount", () => {
  it.each([
    ["vitest", " Tests  1 failed | 279 passed (280)", 279],
    ["jest", "Tests:       2 failed, 40 passed, 42 total", 40],
    ["node:test tap", "# tests 11\n# pass 10\n# fail 0", 10],
    ["node:test spec", "ℹ tests 11\nℹ pass 10\nℹ fail 0", 10],
  ])("reads the %s summary", (_runner, output, expected) => {
    expect(parsePassedCount(output)).toBe(expected);
  });

  it("returns null for an unknown format", () => {
    expect(parsePassedCount("all good")).toBeNull();
  });
});

describe("countAssertionCalls", () => {
  it("counts expect and assert calls", () => {
    expect(countAssertionCalls("expect(a).toBe(1); assert.equal(b, 2); assert(c);")).toBe(3);
  });
});
