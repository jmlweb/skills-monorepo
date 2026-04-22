import { describe, it, expect } from "vitest";
import {
  validatePriority,
  validateComplexity,
  validateReportType,
  validateSeverity,
} from "./types.js";
import { InvalidArgumentError } from "./errors.js";

describe("validatePriority", () => {
  it.each(["P1", "P2", "P3", "P4"])("accepts %s", (v) => {
    expect(validatePriority(v)).toBe(v);
  });

  it("throws InvalidArgumentError for unknown values", () => {
    expect(() => validatePriority("P5")).toThrow(InvalidArgumentError);
    expect(() => validatePriority("P5")).toThrow(/P5/);
  });

  it("rejects the empty string", () => {
    expect(() => validatePriority("")).toThrow(InvalidArgumentError);
  });
});

describe("validateComplexity", () => {
  it.each(["low", "medium", "high"])("accepts %s", (v) => {
    expect(validateComplexity(v)).toBe(v);
  });

  it("throws InvalidArgumentError for unknown values", () => {
    expect(() => validateComplexity("extreme")).toThrow(InvalidArgumentError);
  });
});

describe("validateReportType", () => {
  it.each(["bug", "finding", "improvement", "security"])("accepts %s", (v) => {
    expect(validateReportType(v)).toBe(v);
  });

  it("throws InvalidArgumentError for unknown values", () => {
    expect(() => validateReportType("feature")).toThrow(InvalidArgumentError);
  });
});

describe("validateSeverity", () => {
  it.each(["critical", "high", "medium", "low"])("accepts %s", (v) => {
    expect(validateSeverity(v)).toBe(v);
  });

  it("throws InvalidArgumentError for unknown values", () => {
    expect(() => validateSeverity("catastrophic")).toThrow(InvalidArgumentError);
  });
});
