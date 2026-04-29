import { describe, expect, it } from "vitest";
import { validateCompression } from "./compress-validate.js";

describe("validateCompression", () => {
  const original = [
    "## Description",
    "",
    "This is the original task description with detail.",
    "",
    "## Acceptance Criteria",
    "",
    "- Criterion one",
    "- Criterion two",
    "",
    "## Notes",
    "",
    "Reference TSK-042 and date 2026-04-29 and url https://example.com/path.",
    "",
    "Run `npm install` then check `dist/foo.js`.",
    "",
    "```bash",
    "echo hello",
    "```",
    "",
    "Version v1.2.3 was released.",
  ].join("\n");

  it("passes when compressed preserves all invariants and shrinks", () => {
    const compressed = [
      "## Description",
      "",
      "Original task desc.",
      "",
      "## Acceptance Criteria",
      "",
      "- Criterion one",
      "- Criterion two",
      "",
      "## Notes",
      "",
      "Ref TSK-042, 2026-04-29, https://example.com/path.",
      "",
      "Run `npm install` then `dist/foo.js`.",
      "",
      "```bash",
      "echo hello",
      "```",
      "",
      "v1.2.3 released.",
    ].join("\n");
    const result = validateCompression(original, compressed, {
      protectedSections: ["Acceptance Criteria"],
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.bytesAfter).toBeLessThan(result.bytesBefore);
  });

  it("fails when compressed is empty", () => {
    const result = validateCompression(original, "");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("empty"))).toBe(true);
  });

  it("fails when no shrink (equal or larger)", () => {
    const result = validateCompression(original, original);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("no shrink"))).toBe(true);
  });

  it("fails when a code block is missing", () => {
    const compressed = original.replace(/```bash[\s\S]*?```/, "REMOVED");
    const result = validateCompression(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("missing code block"))).toBe(true);
  });

  it("fails when a code block is byte-mangled", () => {
    const compressed = original.replace("echo hello", "echo Hello");
    const result = validateCompression(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("missing code block"))).toBe(true);
  });

  it("fails when inline code is missing", () => {
    const compressed = original.replace("`npm install`", "npm install");
    const result = validateCompression(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("missing inline code"))).toBe(true);
  });

  it("fails when an ID is missing", () => {
    const compressed = original.replace("TSK-042", "task");
    const result = validateCompression(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("missing ID"))).toBe(true);
  });

  it("fails when a URL is missing", () => {
    const compressed = original.replace("https://example.com/path", "the link");
    const result = validateCompression(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("missing URL"))).toBe(true);
  });

  it("fails when a date is missing", () => {
    const compressed = original.replace("2026-04-29", "yesterday");
    const result = validateCompression(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("missing date"))).toBe(true);
  });

  it("fails when a version is missing", () => {
    const compressed = original.replace("v1.2.3", "the new release");
    const result = validateCompression(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("missing version"))).toBe(true);
  });

  it("fails when headings are reordered", () => {
    const compressed = [
      "## Acceptance Criteria",
      "",
      "- Criterion one",
      "- Criterion two",
      "",
      "## Description",
      "",
      "Short.",
      "",
      "## Notes",
      "",
      "Ref TSK-042, 2026-04-29, https://example.com/path. Run `npm install` then `dist/foo.js`.",
      "",
      "```bash",
      "echo hello",
      "```",
      "",
      "v1.2.3.",
    ].join("\n");
    const result = validateCompression(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("heading mismatch"))).toBe(true);
  });

  it("fails when headings are dropped", () => {
    const compressed = original.replace("## Notes\n", "");
    const result = validateCompression(original, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("heading mismatch"))).toBe(true);
  });

  it("fails when protected section is modified", () => {
    const compressed = original.replace("- Criterion one", "- Criterion uno");
    const result = validateCompression(original, compressed, {
      protectedSections: ["Acceptance Criteria"],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Acceptance Criteria"))).toBe(true);
  });

  it("ignores protected section when not present in either", () => {
    const noAC = "## Description\n\nFoo bar baz qux quux corge grault.";
    const compressed = "## Description\n\nFoo bar.";
    const result = validateCompression(noAC, compressed, {
      protectedSections: ["Acceptance Criteria"],
    });
    expect(result.ok).toBe(true);
  });

  it("treats inline code count as multiset (duplicates matter)", () => {
    const orig = "Use `foo` and also `foo` again, plus filler text to ensure shrink.";
    const compressed = "Use `foo` once.";
    const result = validateCompression(orig, compressed);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("missing inline code"))).toBe(true);
  });
});
