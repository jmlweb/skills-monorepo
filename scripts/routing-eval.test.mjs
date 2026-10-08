import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  buildIndex,
  evaluatePlugin,
  findCollisions,
  findPlugins,
  loadCases,
  loadSkills,
  rankSkills,
  stem,
  tokenize,
} from "./routing-eval.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

const skills = [
  { name: "alpha", description: "Deploy the staging server. Use when the user says \"deploy staging\" or \"ship it\".", modelInvoked: true },
  { name: "beta", description: "Translate documents between languages. Use when the user says \"translate this\" or \"localize\".", modelInvoked: true },
  { name: "gamma", description: "Summarize meeting transcripts into action items. Use when the user says \"summarize the call\".", modelInvoked: true },
  { name: "delta", description: "Rotate database credentials. Use when the user says \"rotate secrets\".", modelInvoked: true },
  { name: "epsilon", description: "Generate invoices for customers. Use when the user says \"bill the client\".", modelInvoked: true },
];

// Top-3 checks are only meaningful with more than three skills to rank.
const fillerCases = {
  delta: {
    positive: ["rotate secrets", "rotate database credentials", "database credentials"],
    negative: [
      { prompt: "bill the client", owner: "epsilon" },
      { prompt: "invoices for customers", owner: "epsilon" },
    ],
  },
  epsilon: {
    positive: ["bill the client", "generate invoices", "invoices for customers"],
    negative: [
      { prompt: "rotate secrets", owner: "delta" },
      { prompt: "database credentials", owner: "delta" },
    ],
  },
};

const passing = {
  rank1Ratchet: 0,
  skills: {
    alpha: {
      positive: ["deploy staging please", "ship it to the staging server", "deploy the server"],
      negative: [
        { prompt: "translate this document", owner: "beta" },
        { prompt: "summarize the call transcript", owner: "gamma" },
      ],
    },
    beta: {
      positive: ["translate this text", "localize the documents", "translate between languages"],
      negative: [
        { prompt: "deploy staging", owner: "alpha" },
        { prompt: "summarize the call", owner: "gamma" },
      ],
    },
    gamma: {
      positive: ["summarize the call", "meeting transcript action items", "summarize meeting"],
      negative: [
        { prompt: "translate this", owner: "beta" },
        { prompt: "deploy staging", owner: "alpha" },
      ],
    },
    ...fillerCases,
  },
};

const clone = (value) => structuredClone(value);

test("tokenizer drops stopwords and stems plurals and gerunds", () => {
  assert.deepEqual(tokenize("The tasks are triaging"), ["task", "triag"]);
  assert.equal(stem("ties"), "tie");
  assert.equal(stem("class"), "class");
});

test("rankSkills puts the matching description first", () => {
  const index = buildIndex(skills);
  assert.equal(rankSkills(index, "please deploy staging")[0].name, "alpha");
  assert.equal(rankSkills(index, "localize this").at(0).name, "beta");
});

test("a consistent fixture passes every check", () => {
  const { failures } = evaluatePlugin(skills, passing);
  assert.deepEqual(failures, []);
});

test("positive prompt outside the top 3 fails", () => {
  const cases = clone(passing);
  cases.skills.epsilon.positive[0] = "rotate database credentials";
  const { failures } = evaluatePlugin(skills, cases);
  assert.ok(failures.some((f) => f.startsWith("epsilon: positive") && f.includes("expected top 3")));
});

test("negative prompt that ranks the skill first fails", () => {
  const cases = clone(passing);
  cases.skills.alpha.negative[0] = { prompt: "deploy staging server", owner: "beta" };
  const { failures } = evaluatePlugin(skills, cases);
  assert.ok(failures.some((f) => f.includes("ranked this skill first")));
});

test("negative prompt whose owner is not in the top 3 fails", () => {
  const cases = clone(passing);
  cases.skills.alpha.negative[0] = { prompt: "rotate database credentials", owner: "epsilon" };
  const { failures } = evaluatePlugin(skills, cases);
  assert.ok(failures.some((f) => f.includes("did not place owner epsilon in top 3")));
});

test("near-duplicate descriptions are reported as collisions", () => {
  const twins = [
    { name: "one", description: "Create a new backlog task for the user", modelInvoked: true },
    { name: "two", description: "Create a new backlog task for the user", modelInvoked: true },
    { name: "other", description: "Deploy the staging server", modelInvoked: true },
  ];
  const collisions = findCollisions(buildIndex(twins));
  assert.equal(collisions.length, 1);
  assert.deepEqual([collisions[0].a, collisions[0].b], ["one", "two"]);
  assert.deepEqual(findCollisions(buildIndex(skills)), []);
});

test("rank-1 rate below the ratchet fails and at-ratchet passes", () => {
  const cases = clone(passing);
  const { rank1Rate } = evaluatePlugin(skills, cases);
  assert.ok(rank1Rate > 0);

  cases.rank1Ratchet = rank1Rate;
  assert.deepEqual(evaluatePlugin(skills, cases).failures, []);

  cases.rank1Ratchet = 1.01;
  assert.ok(evaluatePlugin(skills, cases).failures.some((f) => f.includes("below ratchet")));
});

test("coverage minimums and unknown skills are enforced", () => {
  const cases = clone(passing);
  cases.skills.alpha.positive.pop();
  cases.skills.beta.negative.pop();
  cases.skills.ghost = { positive: [], negative: [] };
  const { failures } = evaluatePlugin(skills, cases);
  assert.ok(failures.some((f) => f.includes("alpha: needs >=3 positive")));
  assert.ok(failures.some((f) => f.includes("beta: needs >=2 negative")));
  assert.ok(failures.some((f) => f.includes('unknown or non-model-invoked skill "ghost"')));
});

test("skills with model invocation disabled are excluded from routing", () => {
  const withManual = [...skills, { name: "manual", description: "Deploy staging server", modelInvoked: false }];
  const { failures } = evaluatePlugin(withManual, passing);
  assert.deepEqual(failures, []);
});

test("every real plugin passes its routing cases", () => {
  const plugins = findPlugins(root);
  assert.ok(plugins.length >= 3);
  for (const dir of plugins) {
    const { failures } = evaluatePlugin(loadSkills(dir), loadCases(dir));
    assert.deepEqual(failures, [], `${dir}\n${failures.join("\n")}`);
  }
});
