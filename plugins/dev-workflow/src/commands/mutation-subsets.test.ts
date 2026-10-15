import { describe, expect, it } from "vitest";
import { analyseMutationReport } from "./mutation-subsets.js";

type Mutant = { status: string; killedBy?: string[]; coveredBy?: string[] };

const report = (mutants: Mutant[], tests: Record<string, string>) =>
  JSON.stringify({
    files: { "src/a.ts": { mutants } },
    testFiles: {
      "a.test.ts": {
        tests: Object.entries(tests).map(([id, name]) => ({ id, name })),
      },
    },
  });

describe("analyseMutationReport", () => {
  it("finds a test whose kills are a subset of another test's kills", () => {
    const result = analyseMutationReport(
      report(
        [
          { status: "Killed", killedBy: ["t1", "t2"], coveredBy: ["t1", "t2"] },
          { status: "Killed", killedBy: ["t2"], coveredBy: ["t2"] },
        ],
        { t1: "narrow", t2: "broad" },
      ),
    );
    expect(result.subsets.map((s) => [s.name, s.subsumedBy.map((t) => t.name)])).toEqual([
      ["narrow", ["broad"]],
    ]);
  });

  it("does not subsume when the test covers a mutant the other misses", () => {
    const result = analyseMutationReport(
      report(
        [
          { status: "Killed", killedBy: ["t2"], coveredBy: ["t1", "t2"] },
          { status: "Survived", killedBy: ["t1"], coveredBy: ["t1"] },
        ],
        { t1: "a", t2: "b" },
      ),
    );
    expect(result.subsets).toEqual([]);
  });

  it("warns when every killed mutant has one killer, the bail-mode signature", () => {
    const result = analyseMutationReport(
      report(
        [
          { status: "Killed", killedBy: ["t1"], coveredBy: ["t1", "t2"] },
          { status: "Killed", killedBy: ["t2"], coveredBy: ["t2"] },
        ],
        { t1: "a", t2: "b" },
      ),
    );
    expect(result.bailSuspected).toBe(true);
  });

  it("lists tests that kill nothing", () => {
    const result = analyseMutationReport(
      report([{ status: "Killed", killedBy: ["t1"] }], { t1: "a", t2: "idle" }),
    );
    expect(result.zeroKill).toEqual([{ id: "t2", name: "idle" }]);
  });
});
