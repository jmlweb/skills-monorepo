import { describe, expect, it } from "vitest";
import {
  ADJECTIVES,
  NOUNS,
  VERBS,
  generateChangesetName,
  generateUniqueChangesetName,
} from "./changeset-name.js";

describe("generateChangesetName", () => {
  it("produces a three-part kebab-case name", () => {
    const name = generateChangesetName(() => 0);
    expect(name).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
  });

  it("uses words from each configured list", () => {
    const name = generateChangesetName(() => 0);
    const [a, n, v] = name.split("-");
    expect(ADJECTIVES).toContain(a as (typeof ADJECTIVES)[number]);
    expect(NOUNS).toContain(n as (typeof NOUNS)[number]);
    expect(VERBS).toContain(v as (typeof VERBS)[number]);
  });

  it("is deterministic given a fixed RNG", () => {
    const rng = sequence([0, 0, 0]);
    expect(generateChangesetName(rng)).toBe(
      `${ADJECTIVES[0]}-${NOUNS[0]}-${VERBS[0]}`,
    );
  });

  it("returns the last word when rng returns values near 1", () => {
    const rng = () => 0.9999;
    const name = generateChangesetName(rng);
    expect(name).toBe(
      `${ADJECTIVES[ADJECTIVES.length - 1]}-${NOUNS[NOUNS.length - 1]}-${
        VERBS[VERBS.length - 1]
      }`,
    );
  });
});

describe("generateUniqueChangesetName", () => {
  it("returns the first candidate when it is available", () => {
    const name = generateUniqueChangesetName(() => true, () => 0);
    expect(name).toBe(`${ADJECTIVES[0]}-${NOUNS[0]}-${VERBS[0]}`);
  });

  it("skips taken names and returns the next available one", () => {
    const first = `${ADJECTIVES[0]}-${NOUNS[0]}-${VERBS[0]}`;
    const second = `${ADJECTIVES[1]}-${NOUNS[1]}-${VERBS[1]}`;
    const taken = new Set([first]);

    const rngValues = [
      0,
      0,
      0, // → first (taken)
      1 / ADJECTIVES.length,
      1 / NOUNS.length,
      1 / VERBS.length, // → second (available)
    ];
    const rng = sequence(rngValues);

    const name = generateUniqueChangesetName(
      (n) => !taken.has(n),
      rng,
    );
    expect(name).toBe(second);
  });

  it("throws when nothing is available within maxAttempts", () => {
    expect(() =>
      generateUniqueChangesetName(() => false, () => 0, 3),
    ).toThrow(/Could not find an unused changeset name/);
  });
});

function sequence(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}
