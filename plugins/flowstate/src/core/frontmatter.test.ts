import { describe, it, expect } from "vitest";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";
import { InvalidArgumentError } from "./errors.js";

describe("parseFrontmatter", () => {
  it("parses simple key-value pairs", () => {
    const input = `---
id: TSK-001
title: Fix auth bug
status: pending
priority: P2
---

# Fix auth bug`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({
      id: "TSK-001",
      title: "Fix auth bug",
      status: "pending",
      priority: "P2",
    });
    expect(result.body).toBe("\n# Fix auth bug");
  });

  it("parses arrays in bracket notation", () => {
    const input = `---
tags: [api, auth, urgent]
depends-on: [TSK-001, TSK-002]
---

Body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter["tags"]).toEqual(["api", "auth", "urgent"]);
    expect(result.frontmatter["depends-on"]).toEqual(["TSK-001", "TSK-002"]);
  });

  it("parses empty arrays", () => {
    const input = `---
tags: []
depends-on: []
---

Body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter["tags"]).toEqual([]);
    expect(result.frontmatter["depends-on"]).toEqual([]);
  });

  it("handles empty body", () => {
    const input = `---
id: TSK-001
---
`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ id: "TSK-001" });
    expect(result.body).toBe("");
  });

  it("handles values with colons", () => {
    const input = `---
title: Fix: auth token expired
blocked-by: waiting for API: needs credentials
---

Body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter["title"]).toBe("Fix: auth token expired");
    expect(result.frontmatter["blocked-by"]).toBe(
      "waiting for API: needs credentials",
    );
  });

  it("throws InvalidArgumentError on missing opening delimiter", () => {
    expect(() => parseFrontmatter("no frontmatter here")).toThrow(
      InvalidArgumentError,
    );
  });

  it("throws InvalidArgumentError on missing closing delimiter", () => {
    expect(() => parseFrontmatter("---\nid: TSK-001\n")).toThrow(
      InvalidArgumentError,
    );
  });

  it("handles empty string values", () => {
    const input = `---
task:
blocked-by:
---

Body`;

    const result = parseFrontmatter(input);
    expect(result.frontmatter["task"]).toBe("");
    expect(result.frontmatter["blocked-by"]).toBe("");
  });
});

describe("serializeFrontmatter", () => {
  it("serializes simple key-value pairs", () => {
    const result = serializeFrontmatter(
      { id: "TSK-001", title: "Fix bug", status: "pending" },
      "\n# Fix bug\n\n## Description\n",
    );

    expect(result).toBe(
      `---\nid: TSK-001\ntitle: Fix bug\nstatus: pending\n---\n\n# Fix bug\n\n## Description\n`,
    );
  });

  it("serializes arrays in bracket notation", () => {
    const result = serializeFrontmatter(
      { tags: ["api", "auth"], "depends-on": [] },
      "\nBody",
    );

    expect(result).toBe(
      `---\ntags: [api, auth]\ndepends-on: []\n---\n\nBody`,
    );
  });

  it("roundtrips a full task document", () => {
    const original = `---
id: TSK-001
title: Fix auth bug
status: pending
priority: P2
tags: [api, auth]
created: 2026-04-05
source: manual
depends-on: []
---

# Fix auth bug

## Description

The auth flow fails.

## Progress Log

- [2026-04-05] Created`;

    const parsed = parseFrontmatter(original);
    const serialized = serializeFrontmatter(parsed.frontmatter, parsed.body);
    const reparsed = parseFrontmatter(serialized);

    expect(reparsed.frontmatter).toEqual(parsed.frontmatter);
    expect(reparsed.body).toBe(parsed.body);
  });
});
