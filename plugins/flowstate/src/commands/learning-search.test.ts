import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { learningSearch } from "./learning-search.js";
import { learningCreate } from "./learning-create.js";
import { setup } from "./setup.js";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "flowstate-test-"));
  await setup(tmp, "Test");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("learningSearch", () => {
  it("returns empty for no learnings", async () => {
    const results = await learningSearch(tmp, { query: "redis" });
    expect(results).toEqual([]);
  });

  it("matches by tag", async () => {
    await learningCreate(tmp, {
      title: "Redis quirk",
      tags: ["redis", "config"],
      body: "Redis needs explicit image name.",
    });

    const results = await learningSearch(tmp, { tags: ["redis"] });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe("LRN-001");
    expect(results[0]!.score).toBeGreaterThan(0);
  });

  it("filters stopwords from query", async () => {
    await learningCreate(tmp, {
      title: "Turborepo pinned version",
      tags: ["turborepo"],
      body: "Always implement a pinned packageManager field.",
    });

    // "implement" and "add" are stopwords — only "turborepo" should score
    const withStopwords = await learningSearch(tmp, {
      query: "implement add turborepo",
    });
    const withoutStopwords = await learningSearch(tmp, {
      query: "turborepo",
    });

    expect(withStopwords).toHaveLength(1);
    expect(withoutStopwords).toHaveLength(1);
    // Scores should be equal since stopwords are filtered
    expect(withStopwords[0]!.score).toBe(withoutStopwords[0]!.score);
  });

  it("filters short terms from query", async () => {
    await learningCreate(tmp, {
      title: "TS config note",
      tags: ["typescript"],
      body: "TypeScript 6 requires @types/node.",
    });

    // "ts" is 2 chars and should be filtered out
    const results = await learningSearch(tmp, { query: "ts" });
    expect(results).toEqual([]);
  });

  it("excludes body from output by default", async () => {
    await learningCreate(tmp, {
      title: "Redis quirk",
      tags: ["redis"],
      body: "Some detailed content here.",
    });

    const results = await learningSearch(tmp, { tags: ["redis"] });
    expect(results[0]!.body).toBeUndefined();
  });

  it("includes body when requested", async () => {
    await learningCreate(tmp, {
      title: "Redis quirk",
      tags: ["redis"],
      body: "Some detailed content here.",
    });

    const results = await learningSearch(tmp, {
      tags: ["redis"],
      includeBody: true,
    });
    expect(results[0]!.body).toContain("detailed content");
  });
});
