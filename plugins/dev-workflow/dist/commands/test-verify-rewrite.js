import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCoverage } from "./coverage-subsets.js";
import { TestCommandError } from "../core/errors.js";
import { runCommand } from "../core/spawn.js";
import { countAssertionCalls, parsePassedCount } from "../core/test-output.js";
export const Claim = {
    LINES: "lines",
    TIME: "time",
    FOLD: "fold",
};
const COVERAGE_FILES = ["coverage-final.json", "lcov.info"];
const ITEM_KIND = /:(?:stmt|line|branch):/;
// The rewritten test file's own lines change by design, so they are left out;
// only code under test has to stay covered.
export function lostCoverage(before, after, testFile) {
    const isTestFile = (item) => item.slice(0, item.search(ITEM_KIND)).replace(/\\/g, "/").endsWith(testFile);
    return [...before].filter((item) => !after.has(item) && !isTestFile(item));
}
function collectCoverage(cwd, file, template, timeoutMs) {
    const dir = mkdtempSync(join(tmpdir(), "verify-cov-"));
    try {
        const argv = template.map((part) => part.replace("{file}", file).replace("{dir}", dir));
        const result = runCommand(cwd, argv, timeoutMs);
        if (result.exitCode !== 0 || result.timedOut) {
            throw new TestCommandError(`Coverage command failed for ${file}: ${argv.join(" ")}`);
        }
        const found = COVERAGE_FILES.map((name) => join(dir, name)).find((path) => existsSync(path));
        if (!found) {
            throw new TestCommandError(`Coverage command wrote no ${COVERAGE_FILES.join(" or ")} into {dir}.`);
        }
        return parseCoverage(readFileSync(found, "utf-8"));
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
}
export function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
        : (sorted[mid] ?? 0);
}
function summarise(runs) {
    const durations = runs.map((r) => r.durationMs);
    const counts = runs.map((r) => parsePassedCount(r.stdout + r.stderr));
    const first = counts[0] ?? null;
    return {
        passed: runs.every((r) => r.exitCode === 0 && !r.timedOut),
        cases: first !== null && counts.every((c) => c === first) ? first : null,
        medianMs: median(durations),
        spreadMs: Math.max(...durations) - Math.min(...durations),
    };
}
function runMany(cwd, file, template, runs, timeoutMs) {
    const argv = template.map((part) => part.replace("{file}", file));
    return summarise(Array.from({ length: runs }, () => runCommand(cwd, argv, timeoutMs)));
}
// Time gains are compared against the spread between runs, so noise is never
// reported as a speed-up.
export function timeGainHolds(baseline, rewrite) {
    return baseline.medianMs - rewrite.medianMs > baseline.spreadMs;
}
export function judge(input) {
    const { baseline, rewrite, shuffled, assertions, claim } = input;
    const reasons = [];
    if (!rewrite.passed)
        reasons.push("rewritten file fails in at least one run");
    if (shuffled && !shuffled.passed) {
        reasons.push("rewritten file fails when test order is shuffled");
    }
    if (rewrite.cases === null || baseline.cases === null) {
        reasons.push("passed count is unknown or differs between runs; cannot prove no test case was lost");
    }
    else if (rewrite.cases < baseline.cases) {
        reasons.push(`passed cases fell from ${baseline.cases} to ${rewrite.cases}`);
    }
    // A folded table runs one assertion call once per row, so a lower static
    // count is expected; the held case count is what proves no check was lost.
    const foldHeld = claim === Claim.FOLD && rewrite.cases !== null && baseline.cases !== null && rewrite.cases >= baseline.cases;
    if (assertions.after < assertions.before && !foldHeld) {
        reasons.push(`assertion calls fell from ${assertions.before} to ${assertions.after}`);
    }
    if (claim === Claim.TIME && !timeGainHolds(baseline, rewrite)) {
        reasons.push("time gain is within the spread between runs");
    }
    return reasons;
}
// The original file is restored in `finally`, so a crash, a timeout or a thrown
// error can never leave the rewrite on disk.
export function verifyRewrite(options) {
    const target = join(options.cwd, options.file);
    const original = readFileSync(target, "utf-8");
    const rewritten = readFileSync(options.rewrittenPath, "utf-8");
    try {
        const baseline = runMany(options.cwd, options.file, options.command, options.runs, options.timeoutMs);
        const coverageBefore = options.coverageCommand
            ? collectCoverage(options.cwd, options.file, options.coverageCommand, options.timeoutMs)
            : null;
        writeFileSync(target, rewritten);
        const rewrite = runMany(options.cwd, options.file, options.command, options.runs, options.timeoutMs);
        const shuffled = options.shuffleArgs.length > 0
            ? runMany(options.cwd, options.file, [...options.command, ...options.shuffleArgs], options.runs, options.timeoutMs)
            : null;
        const assertions = {
            before: countAssertionCalls(original),
            after: countAssertionCalls(rewritten),
        };
        const coverageAfter = options.coverageCommand
            ? collectCoverage(options.cwd, options.file, options.coverageCommand, options.timeoutMs)
            : null;
        const coverage = coverageBefore && coverageAfter
            ? {
                before: coverageBefore.size,
                after: coverageAfter.size,
                lost: lostCoverage(coverageBefore, coverageAfter, options.file),
            }
            : null;
        const reasons = [
            ...judge({ baseline, rewrite, shuffled, assertions, claim: options.claim }),
            ...(coverage && coverage.lost.length > 0
                ? [`coverage of code under test lost ${coverage.lost.length} item(s), first: ${coverage.lost[0]}`]
                : []),
        ];
        return {
            file: options.file,
            verdict: reasons.length === 0 ? "pass" : "fail",
            reasons,
            baseline,
            rewrite,
            shuffled,
            assertions,
            timeGain: options.claim === Claim.TIME ? timeGainHolds(baseline, rewrite) : null,
            coverage,
        };
    }
    finally {
        writeFileSync(target, original);
    }
}
