import { describe, it, expect } from "vitest";
import {
  validatePriority,
  validateComplexity,
  validateReportType,
  validateSeverity,
  validateIdeaDecision,
  validateReportDecision,
  validateTitle,
  validateSingleLine,
  validateTaskId,
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

describe("validateTitle", () => {
  it("returns a single-line title unchanged, pipes included", () => {
    expect(validateTitle("Fix a | b")).toBe("Fix a | b");
  });

  it.each(["Line one\nline two", "Carriage\rreturn", "trailing\n"])("rejects %j", (v) => {
    expect(() => validateTitle(v)).toThrow(InvalidArgumentError);
    expect(() => validateTitle(v)).toThrow(/single line/);
  });

  it.each(["", "   ", "\t"])("rejects a blank title %j", (v) => {
    expect(() => validateTitle(v)).toThrow(InvalidArgumentError);
    expect(() => validateTitle(v)).toThrow(/must not be empty/);
  });
});

describe("validateSingleLine", () => {
  it("returns a single-line value unchanged", () => {
    expect(validateSingleLine("--reason", "waiting: on review")).toBe("waiting: on review");
  });

  it.each(["waiting\npriority: P1", "a\rb"])("rejects %j naming the flag", (v) => {
    expect(() => validateSingleLine("--reason", v)).toThrow(InvalidArgumentError);
    expect(() => validateSingleLine("--reason", v)).toThrow(/Invalid --reason: it must be a single line/);
  });
});

describe("validateTaskId", () => {
  it.each(["TSK-001", "TSK-084", "TSK-1234"])("accepts %s", (v) => {
    expect(validateTaskId(v)).toBe(v);
  });

  it.each(["banana", "PLN-001", "TSK-1", "tsk-001", "TSK-001\nseverity: critical", ""])(
    "rejects %j",
    (v) => {
      expect(() => validateTaskId(v)).toThrow(InvalidArgumentError);
      expect(() => validateTaskId(v)).toThrow(/Invalid --task-id/);
    },
  );
});

describe("validateIdeaDecision", () => {
  it.each(["approved", "discarded"])("accepts %s", (v) => {
    expect(validateIdeaDecision(v)).toBe(v);
  });

  it.each(["pending", "bogus", ""])("rejects %j with the expected values", (v) => {
    expect(() => validateIdeaDecision(v)).toThrow(InvalidArgumentError);
    expect(() => validateIdeaDecision(v)).toThrow(/approved, discarded/);
  });
});

describe("validateReportDecision", () => {
  it.each(["triaged", "discarded"])("accepts %s", (v) => {
    expect(validateReportDecision(v)).toBe(v);
  });

  it.each(["pending", "approved", ""])("rejects %j with the expected values", (v) => {
    expect(() => validateReportDecision(v)).toThrow(InvalidArgumentError);
    expect(() => validateReportDecision(v)).toThrow(/triaged, discarded/);
  });
});
