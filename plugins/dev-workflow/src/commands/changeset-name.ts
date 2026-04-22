import { readdirSync } from "node:fs";
import { join } from "node:path";

export const ADJECTIVES = [
  "brave",
  "calm",
  "cool",
  "fast",
  "happy",
  "kind",
  "loud",
  "nice",
  "quick",
  "warm",
  "wild",
  "wise",
] as const;

export const NOUNS = [
  "ants",
  "bees",
  "cats",
  "dogs",
  "eels",
  "fish",
  "goats",
  "hawks",
  "jays",
  "lions",
] as const;

export const VERBS = [
  "dance",
  "fly",
  "grow",
  "hide",
  "jump",
  "kick",
  "leap",
  "march",
  "play",
  "rest",
  "sing",
  "walk",
] as const;

export type NameRandom = () => number;

export type AvailabilityCheck = (name: string) => boolean;

export function generateChangesetName(random: NameRandom = Math.random): string {
  const a = pick(ADJECTIVES, random);
  const n = pick(NOUNS, random);
  const v = pick(VERBS, random);
  return `${a}-${n}-${v}`;
}

export function generateUniqueChangesetName(
  isAvailable: AvailabilityCheck,
  random: NameRandom = Math.random,
  maxAttempts = 50,
): string {
  for (let i = 0; i < maxAttempts; i++) {
    const name = generateChangesetName(random);
    if (isAvailable(name)) return name;
  }
  throw new Error(
    `Could not find an unused changeset name after ${maxAttempts} attempts. Clean up unused entries in .changeset/ or extend the word lists.`,
  );
}

export function listChangesetNames(cwd: string, dir: string): Set<string> {
  try {
    const entries = readdirSync(join(cwd, dir));
    const names = new Set<string>();
    for (const entry of entries) {
      if (entry.endsWith(".md") && entry !== "README.md") {
        names.add(entry.slice(0, -3));
      }
    }
    return names;
  } catch {
    return new Set();
  }
}

function pick<T>(list: readonly T[], random: NameRandom): T {
  const idx = Math.floor(random() * list.length);
  return list[idx]!;
}
