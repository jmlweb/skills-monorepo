import { describe, it, expect } from "vitest";
import { parseId, formatId, normalizeIdInput } from "./id.js";

describe("parseId", () => {
  it("parses full ID", () => {
    expect(parseId("TSK-001")).toEqual({ type: "task", num: 1 });
    expect(parseId("PLN-042")).toEqual({ type: "idea", num: 42 });
    expect(parseId("RPT-100")).toEqual({ type: "report", num: 100 });
    expect(parseId("LRN-007")).toEqual({ type: "learning", num: 7 });
  });

  it("throws on invalid prefix", () => {
    expect(() => parseId("FOO-001")).toThrow();
  });

  it("throws on invalid format", () => {
    expect(() => parseId("TSK")).toThrow();
    expect(() => parseId("")).toThrow();
  });
});

describe("formatId", () => {
  it("formats with zero-padded 3-digit number", () => {
    expect(formatId("task", 1)).toBe("TSK-001");
    expect(formatId("idea", 42)).toBe("PLN-042");
    expect(formatId("report", 100)).toBe("RPT-100");
    expect(formatId("learning", 7)).toBe("LRN-007");
  });
});

describe("normalizeIdInput", () => {
  it("normalizes bare number to full ID", () => {
    expect(normalizeIdInput("1", "task")).toBe("TSK-001");
    expect(normalizeIdInput("42", "idea")).toBe("PLN-042");
  });

  it("normalizes zero-padded number", () => {
    expect(normalizeIdInput("001", "task")).toBe("TSK-001");
  });

  it("passes through full ID unchanged", () => {
    expect(normalizeIdInput("TSK-001", "task")).toBe("TSK-001");
  });

  it("normalizes case-insensitive prefix", () => {
    expect(normalizeIdInput("tsk-001", "task")).toBe("TSK-001");
  });
});
