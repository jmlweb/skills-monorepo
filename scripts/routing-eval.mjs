#!/usr/bin/env node
// Tier-1 routing eval: deterministic TF-IDF over skill descriptions. It cannot predict what the
// model picks, but it flags description edits that make one skill absorb a neighbour's prompts.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TOP_N = 3;
export const COLLISION_THRESHOLD = 0.6;
export const MIN_POSITIVE = 3;
export const MIN_NEGATIVE = 2;

const STOPWORDS = new Set(
  `a an and are as at be but by for from has have how i if in into is it its me my of on or our so
  that the their then there these this to up use used uses using want when where which while with
  you your user users says say said can will do does not no any all also than over per via`
    .split(/\s+/)
    .filter(Boolean),
);

// Light suffix stripping: enough to equate "tasks"/"task" and "triaging"/"triage" without a library.
export function stem(word) {
  let w = word;
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && w.endsWith("sses")) return w.slice(0, -2);
  for (const suffix of ["ing", "ed", "ly", "es", "s"]) {
    if (w.length - suffix.length >= 3 && w.endsWith(suffix) && !w.endsWith("ss")) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  return w.length > 4 && w.endsWith("e") ? w.slice(0, -1) : w;
}

export function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

function termFrequencies(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

function norm(vec) {
  let sum = 0;
  for (const v of vec.values()) sum += v * v;
  return Math.sqrt(sum);
}

function cosine(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [t, v] of small) dot += v * (large.get(t) ?? 0);
  return dot / (na * nb);
}

export function buildIndex(skills) {
  const docs = skills.map((s) => ({
    name: s.name,
    tf: termFrequencies(tokenize(`${s.name} ${s.description}`)),
  }));
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = new Map(
    [...df].map(([t, n]) => [t, Math.log((docs.length + 1) / (n + 1)) + 1]),
  );
  const weigh = (tf) => new Map([...tf].filter(([t]) => idf.has(t)).map(([t, n]) => [t, n * idf.get(t)]));
  return { idf, weigh, vectors: docs.map((d) => ({ name: d.name, vec: weigh(d.tf) })) };
}

// Ties break alphabetically so results do not depend on directory listing order.
export function rankSkills(index, prompt) {
  const q = index.weigh(termFrequencies(tokenize(prompt)));
  return index.vectors
    .map((d) => ({ name: d.name, score: cosine(q, d.vec) }))
    .sort((x, y) => y.score - x.score || x.name.localeCompare(y.name));
}

export function findCollisions(index, threshold = COLLISION_THRESHOLD) {
  const found = [];
  for (let i = 0; i < index.vectors.length; i++) {
    for (let j = i + 1; j < index.vectors.length; j++) {
      const a = index.vectors[i];
      const b = index.vectors[j];
      const similarity = cosine(a.vec, b.vec);
      if (similarity >= threshold) found.push({ a: a.name, b: b.name, similarity });
    }
  }
  return found;
}

function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) return {};
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z-]+):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return fields;
}

export function loadSkills(pluginDir) {
  const skillsDir = join(pluginDir, "skills");
  if (!existsSync(skillsDir)) throw new Error(`No skills directory at ${skillsDir}`);
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const file = join(skillsDir, e.name, "SKILL.md");
      if (!existsSync(file)) throw new Error(`Missing ${file}`);
      const fm = parseFrontmatter(readFileSync(file, "utf8"));
      if (!fm.description) throw new Error(`No description in ${file}`);
      return {
        name: fm.name ?? e.name,
        description: fm.description,
        modelInvoked: fm["disable-model-invocation"] !== "true",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function loadCases(pluginDir) {
  const file = join(pluginDir, "evals", "routing.json");
  if (!existsSync(file)) throw new Error(`Missing ${file}`);
  return JSON.parse(readFileSync(file, "utf8"));
}

export function evaluatePlugin(skills, cases, options = {}) {
  const threshold = options.collisionThreshold ?? COLLISION_THRESHOLD;
  const failures = [];
  const routable = skills.filter((s) => s.modelInvoked);
  const index = buildIndex(routable);
  const names = new Set(routable.map((s) => s.name));
  const entries = cases.skills ?? {};

  for (const name of Object.keys(entries)) {
    if (!names.has(name)) failures.push(`routing.json lists unknown or non-model-invoked skill "${name}"`);
  }

  let positives = 0;
  let rank1 = 0;
  for (const { name } of routable) {
    const entry = entries[name];
    const positive = entry?.positive ?? [];
    const negative = entry?.negative ?? [];
    if (positive.length < MIN_POSITIVE) {
      failures.push(`${name}: needs >=${MIN_POSITIVE} positive prompts, has ${positive.length}`);
    }
    if (negative.length < MIN_NEGATIVE) {
      failures.push(`${name}: needs >=${MIN_NEGATIVE} negative prompts, has ${negative.length}`);
    }

    for (const prompt of positive) {
      const ranking = rankSkills(index, prompt).map((r) => r.name);
      const position = ranking.indexOf(name) + 1;
      positives++;
      if (position === 1) rank1++;
      if (position > TOP_N) {
        failures.push(`${name}: positive "${prompt}" ranked #${position}, expected top ${TOP_N} (got ${ranking.slice(0, TOP_N).join(", ")})`);
      }
    }

    for (const { prompt, owner } of negative) {
      if (!names.has(owner)) {
        failures.push(`${name}: negative "${prompt}" names unknown owner "${owner}"`);
        continue;
      }
      const ranking = rankSkills(index, prompt).map((r) => r.name);
      if (ranking[0] === name) {
        failures.push(`${name}: negative "${prompt}" ranked this skill first (owner: ${owner})`);
      }
      if (!ranking.slice(0, TOP_N).includes(owner)) {
        failures.push(`${name}: negative "${prompt}" did not place owner ${owner} in top ${TOP_N} (got ${ranking.slice(0, TOP_N).join(", ")})`);
      }
    }
  }

  for (const { a, b, similarity } of findCollisions(index, threshold)) {
    failures.push(`description collision: ${a} <-> ${b} (cosine ${similarity.toFixed(2)} >= ${threshold})`);
  }

  const rank1Rate = positives === 0 ? 0 : rank1 / positives;
  const ratchet = cases.rank1Ratchet ?? 0;
  if (rank1Rate + 1e-9 < ratchet) {
    failures.push(`rank-1 rate ${rank1Rate.toFixed(3)} fell below ratchet ${ratchet}`);
  }

  return { failures, rank1Rate, positives };
}

export function findPlugins(root) {
  const dir = join(root, "plugins");
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, "skills")))
    .map((e) => join(dir, e.name))
    .sort();
}

function main(argv) {
  const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const update = argv.includes("--update-ratchet");
  let failed = false;
  for (const pluginDir of findPlugins(root)) {
    const label = pluginDir.slice(root.length + 1);
    const cases = loadCases(pluginDir);
    const { failures, rank1Rate } = evaluatePlugin(loadSkills(pluginDir), cases);
    console.log(`${label}: rank-1 ${rank1Rate.toFixed(3)} (ratchet ${cases.rank1Ratchet ?? 0})`);
    if (update && rank1Rate > (cases.rank1Ratchet ?? 0)) {
      // Floor to 3 decimals so float noise never makes the stored ratchet unreachable.
      const next = Math.floor(rank1Rate * 1000) / 1000;
      writeFileSync(join(pluginDir, "evals", "routing.json"), `${JSON.stringify({ ...cases, rank1Ratchet: next }, null, 2)}\n`);
      console.log(`  ratchet raised to ${next}`);
    }
    for (const f of failures) console.log(`  FAIL ${f}`);
    if (failures.length > 0) failed = true;
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
