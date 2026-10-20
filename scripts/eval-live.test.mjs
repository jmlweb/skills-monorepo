import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPreconditions, summarize } from "./eval-live.mjs";

const run = (passed, costUsd, error = null) => ({ score: passed ? 1 : 0, passed, turns: 2, costUsd, judgeCostUsd: 0, error });

const result = {
  schemaVersion: 1,
  claudeVersion: "2.1.304",
  startedAt: "2026-10-20T00:46:19.526Z",
  costUsd: 0.12345,
  partial: false,
  suite: { modelOverride: "sonnet", plugins: [{ name: "flowstate", version: "2.18.2", path: "/x" }] },
  cases: [
    { name: "add-task-fires", arms: { with: [run(true, 0.03), run(true, 0.03)] }, aggregates: { score: 1, passRate: 1 } },
    { name: "idea-fires", arms: { with: [run(true, 0.03), run(false, 0.03345, "max_turns")] }, aggregates: { score: 0.5, passRate: 0.5 } },
  ],
  aggregates: { casesTotal: 2, casesPassed: 1, overallScore: 0.75, overallPassRate: 0.5 },
};

test("summarize emits one record per case plus a suite record", () => {
  const records = summarize(result);
  assert.equal(records.length, 3);
  assert.deepEqual(records.map((r) => r.case), ["add-task-fires", "idea-fires", "*"]);
  for (const r of records) {
    assert.equal(r.plugin, "flowstate");
    assert.equal(r.pluginVersion, "2.18.2");
    assert.equal(r.model, "sonnet");
    assert.equal(r.date, "2026-10-20T00:46:19.526Z");
  }
});

test("case records count passed runs and keep run errors", () => {
  const [, idea] = summarize(result);
  assert.equal(idea.runs, 2);
  assert.equal(idea.passed, 1);
  assert.equal(idea.passRate, 0.5);
  assert.equal(idea.costUsd, 0.0635);
  assert.deepEqual(idea.errors, ["max_turns"]);
});

test("suite record carries totals and the partial flag", () => {
  const suite = summarize({ ...result, partial: true }).at(-1);
  assert.equal(suite.casesPassed, 1);
  assert.equal(suite.casesTotal, 2);
  assert.equal(suite.passRate, 0.5);
  assert.equal(suite.costUsd, 0.1235);
  assert.equal(suite.partial, true);
});

test("checkPreconditions allows only a clean main", () => {
  assert.equal(checkPreconditions({ branch: "main", porcelain: "" }), null);
  assert.match(checkPreconditions({ branch: "feat/x", porcelain: "" }), /not main/);
  assert.match(checkPreconditions({ branch: "main", porcelain: " M README.md\n" }), /not clean/);
});
