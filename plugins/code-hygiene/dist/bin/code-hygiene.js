#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { InvalidArgumentError } from "../core/errors.js";
import { parseFlags } from "../core/args.js";
import { detectRunnerInDir } from "../commands/detect-test-runner.js";
import { lastChangedAtFromGit, readSourceFiles, scanTests, } from "../commands/test-static-scan.js";
import { Claim, verifyRewrite, } from "../commands/test-verify-rewrite.js";
import { findCoverageSubsets, loadCoverageSets, } from "../commands/coverage-subsets.js";
import { analyseMutationReport } from "../commands/mutation-subsets.js";
const EXIT_CLEAN = 0;
const EXIT_FINDINGS = 1;
const EXIT_ERROR = 2;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
function parseStringArray(raw, fallback) {
    if (raw === undefined)
        return fallback;
    const value = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
        throw new InvalidArgumentError(`Expected a JSON array of strings, got: ${raw}`);
    }
    return value;
}
function parsePositiveInt(raw, fallback, name) {
    if (raw === undefined)
        return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) {
        throw new InvalidArgumentError(`--${name} must be a positive integer, got: ${raw}`);
    }
    return value;
}
function parseClaim(raw) {
    if (raw === undefined)
        return Claim.LINES;
    const claims = Object.values(Claim);
    if (!claims.includes(raw)) {
        throw new InvalidArgumentError(`--claim must be one of ${claims.join(", ")}, got: ${raw}`);
    }
    return raw;
}
function printVerify(report) {
    console.log(`${report.verdict.toUpperCase()}  ${report.file}`);
    console.log(`  cases:      ${report.baseline.cases ?? "?"} -> ${report.rewrite.cases ?? "?"}`);
    console.log(`  assertions: ${report.assertions.before} -> ${report.assertions.after}`);
    console.log(`  median ms:  ${Math.round(report.baseline.medianMs)} -> ${Math.round(report.rewrite.medianMs)}`);
    if (report.coverage) {
        console.log(`  coverage:   ${report.coverage.before} -> ${report.coverage.after} items, ${report.coverage.lost.length} lost`);
    }
    for (const reason of report.reasons)
        console.log(`  - ${reason}`);
}
// Flags that may appear without a value; every other flag needs one.
const SWITCHES = new Set(["json", "help"]);
async function main() {
    const [command, ...rest] = process.argv.slice(2);
    if (!command || command === "--help" || command === "-h") {
        console.error([
            "Usage: code-hygiene <command> [flags]",
            "",
            "Commands:",
            "  detect-test-runner   Detect the test runner, its command and coverage support",
            "  test-static-scan     Find assertion-free, trivial, skipped, duplicate and sleepy tests",
            "  test-verify-rewrite  Check a test rewrite keeps its cases, assertions and stability",
            "  coverage-subsets     Find test files whose coverage is a subset of another's",
            "  mutation-subsets     Find tests whose kill set is a subset of another's (Stryker report)",
        ].join("\n"));
        return command ? EXIT_CLEAN : EXIT_ERROR;
    }
    // Parsed inside the try so a bad flag reports like any other InvalidArgumentError.
    let json = false;
    try {
        const flags = parseFlags(rest, SWITCHES);
        json = flags["json"] === "true";
        const cwd = flags["cwd"] ?? process.cwd();
        switch (command) {
            case "detect-test-runner": {
                const result = detectRunnerInDir(cwd);
                if (json) {
                    console.log(JSON.stringify(result, null, 2));
                }
                else {
                    console.log(`runner: ${result.runner}`);
                    console.log(`command: ${result.testCommand?.join(" ") ?? "none"}`);
                    for (const note of result.notes)
                        console.log(`note: ${note}`);
                }
                return result.runner === "unknown" ? EXIT_FINDINGS : EXIT_CLEAN;
            }
            case "test-static-scan": {
                const report = scanTests(readSourceFiles(cwd), {
                    now: Date.now(),
                    lastChangedAt: lastChangedAtFromGit(cwd),
                });
                if (json) {
                    console.log(JSON.stringify(report, null, 2));
                }
                else {
                    console.log(`${report.tests} tests in ${report.testFiles} files`);
                    console.log(`assertion-free: ${report.assertionFree.length}`);
                    console.log(`trivial assertions: ${report.trivialAssertion.length}`);
                    console.log(`duplicate groups: ${report.duplicates.length}`);
                    console.log(`parameterisable groups: ${report.parameterisable.length}`);
                    console.log(`sleep/timer tests: ${report.sleepTests.length}`);
                    console.log(`skipped/todo: ${report.skipped.length}`);
                }
                return EXIT_CLEAN;
            }
            case "test-verify-rewrite": {
                if (!flags["file"] || !flags["rewritten"]) {
                    throw new InvalidArgumentError("test-verify-rewrite needs --file <path> and --rewritten <path>.");
                }
                const report = verifyRewrite({
                    cwd,
                    file: flags["file"],
                    rewrittenPath: flags["rewritten"],
                    command: parseStringArray(flags["command"], []),
                    shuffleArgs: parseStringArray(flags["shuffle-args"], []),
                    runs: parsePositiveInt(flags["runs"], 3, "runs"),
                    timeoutMs: parsePositiveInt(flags["timeout-ms"], DEFAULT_TIMEOUT_MS, "timeout-ms"),
                    claim: parseClaim(flags["claim"]),
                    coverageCommand: flags["coverage-command"]
                        ? parseStringArray(flags["coverage-command"], [])
                        : null,
                });
                if (json) {
                    console.log(JSON.stringify(report, null, 2));
                }
                else {
                    printVerify(report);
                }
                return report.verdict === "pass" ? EXIT_CLEAN : EXIT_FINDINGS;
            }
            case "coverage-subsets": {
                if (!flags["units"]) {
                    throw new InvalidArgumentError("coverage-subsets needs --units <path to JSON array>.");
                }
                const units = JSON.parse(readFileSync(flags["units"], "utf-8"));
                const result = findCoverageSubsets(loadCoverageSets(units));
                if (json) {
                    console.log(JSON.stringify(result, null, 2));
                }
                else {
                    for (const s of result.subsets) {
                        console.log(`${s.id}\t${Math.round(s.durationMs)}ms\tcovered by ${s.coveredBy.join(", ")}`);
                    }
                }
                return result.subsets.length > 0 ? EXIT_FINDINGS : EXIT_CLEAN;
            }
            case "mutation-subsets": {
                if (!flags["report"]) {
                    throw new InvalidArgumentError("mutation-subsets needs --report <path to Stryker JSON>.");
                }
                const result = analyseMutationReport(readFileSync(flags["report"], "utf-8"));
                if (json) {
                    console.log(JSON.stringify(result, null, 2));
                }
                else {
                    if (result.bailSuspected) {
                        console.log("warning: bail mode suspected; rerun Stryker with disableBail: true");
                    }
                    for (const s of result.subsets) {
                        console.log(`${s.name}\tkills ${s.kills}\tsubsumed by ${s.subsumedBy.map((t) => t.name).join(", ")}`);
                    }
                }
                return result.subsets.length > 0 ? EXIT_FINDINGS : EXIT_CLEAN;
            }
            default:
                console.error(`Unknown command: ${command}`);
                return EXIT_ERROR;
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (json) {
            console.error(JSON.stringify({ error: message }));
        }
        else {
            console.error(`Error: ${message}`);
        }
        return EXIT_ERROR;
    }
}
main().then((code) => {
    process.exit(code);
});
