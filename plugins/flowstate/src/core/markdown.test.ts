import { describe, it, expect } from "vitest";
import {
  appendToSection,
  addTableRow,
  removeTableRow,
  replaceSection,
  updateStatsTable,
  appendToBody,
  hasSection,
} from "./markdown.js";

describe("appendToSection", () => {
  const doc = `# Title

## Progress Log

- [2026-04-01] Created

## Notes

Some notes`;

  it("appends text to the end of a section", () => {
    const result = appendToSection(doc, "Progress Log", "- [2026-04-05] Started");
    expect(result).toContain("- [2026-04-01] Created\n- [2026-04-05] Started");
    expect(result).toContain("## Notes\n\nSome notes");
  });

  it("appends to last section", () => {
    const result = appendToSection(doc, "Notes", "More notes");
    expect(result).toContain("Some notes\nMore notes");
  });

  it("throws if section not found", () => {
    expect(() => appendToSection(doc, "Missing", "text")).toThrow();
  });
});

describe("addTableRow", () => {
  const doc = `## Pending Tasks

| ID | Title | Priority |
|----|-------|----------|

## Recently Completed`;

  it("adds a row to an empty table", () => {
    const result = addTableRow(doc, "Pending Tasks", "| TSK-001 | Fix bug | P2 |");
    expect(result).toContain(
      "|----|-------|----------|\n| TSK-001 | Fix bug | P2 |",
    );
  });

  it("adds a row to a table with existing rows", () => {
    const withRow = addTableRow(doc, "Pending Tasks", "| TSK-001 | Fix bug | P2 |");
    const result = addTableRow(withRow, "Pending Tasks", "| TSK-002 | Add feature | P3 |");
    expect(result).toContain("| TSK-001 | Fix bug | P2 |");
    expect(result).toContain("| TSK-002 | Add feature | P3 |");
  });
});

describe("removeTableRow", () => {
  const doc = `## Pending Tasks

| ID | Title | Priority |
|----|-------|----------|
| TSK-001 | Fix bug | P2 |
| TSK-002 | Add feature | P3 |

## Other`;

  it("removes a row matching a predicate", () => {
    const result = removeTableRow(doc, "Pending Tasks", (row) =>
      row.includes("TSK-001"),
    );
    expect(result).not.toContain("TSK-001");
    expect(result).toContain("TSK-002");
  });

  it("returns unchanged if no match", () => {
    const result = removeTableRow(doc, "Pending Tasks", (row) =>
      row.includes("TSK-999"),
    );
    expect(result).toContain("TSK-001");
    expect(result).toContain("TSK-002");
  });
});

describe("replaceSection", () => {
  const doc = `## Active Tasks

_No active tasks._

## Pending Tasks

| ID | Title |`;

  it("replaces section content", () => {
    const result = replaceSection(
      doc,
      "Active Tasks",
      "- TSK-001: Fix bug (P2)",
    );
    expect(result).toContain("## Active Tasks\n\n- TSK-001: Fix bug (P2)");
    expect(result).toContain("## Pending Tasks");
  });
});

describe("updateStatsTable", () => {
  const doc = `## Stats

| Status | Count |
|--------|-------|
| Pending | 0 |
| Active | 0 |
| Blocked | 0 |
| Complete | 0 |

## Active Tasks`;

  it("updates stat counts", () => {
    const result = updateStatsTable(doc, {
      Pending: 3,
      Active: 1,
      Blocked: 0,
      Complete: 5,
    });
    expect(result).toContain("| Pending | 3 |");
    expect(result).toContain("| Active | 1 |");
    expect(result).toContain("| Complete | 5 |");
  });
});

describe("hasSection", () => {
  it("returns true when the heading is present", () => {
    expect(hasSection("# Title\n\n## Learnings\n\nContent", "Learnings")).toBe(true);
  });

  it("returns false when the heading is absent", () => {
    expect(hasSection("# Title\n\n## Notes\n", "Learnings")).toBe(false);
  });

  it("does not match substrings of other headings", () => {
    expect(hasSection("## Learnings extra\n", "Learnings")).toBe(false);
  });
});

describe("appendToBody", () => {
  it("appends an entry to a body without trailing blank lines", () => {
    const body = "- [2026-04-01] Created";
    const result = appendToBody(body, "- [2026-04-02] Updated");
    expect(result).toBe("- [2026-04-01] Created\n- [2026-04-02] Updated");
  });

  it("inserts before trailing blank lines", () => {
    const body = "- [2026-04-01] Created\n\n";
    const result = appendToBody(body, "- [2026-04-02] Updated");
    expect(result).toBe("- [2026-04-01] Created\n- [2026-04-02] Updated\n\n");
  });

  it("handles multiple trailing blank lines", () => {
    const body = "- first\n\n\n";
    const result = appendToBody(body, "- second");
    expect(result).toBe("- first\n- second\n\n\n");
  });

  it("handles an empty body", () => {
    const result = appendToBody("", "- entry");
    expect(result).toBe("- entry\n");
  });

  it("preserves non-trailing blank lines inside the body", () => {
    const body = "## Heading\n\nParagraph\n\n- item";
    const result = appendToBody(body, "- another");
    expect(result).toBe("## Heading\n\nParagraph\n\n- item\n- another");
  });
});
