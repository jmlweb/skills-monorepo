#!/usr/bin/env node
// PreToolUse hook for Edit, Write and NotebookEdit. Exit 0 lets the call go
// ahead; exit 2 blocks it and stderr becomes the reason Claude sees.
import { runReadOnlyZonesHook } from "../core/read-only-zones.js";
async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks).toString("utf8");
}
runReadOnlyZonesHook({
    projectDir: process.env["CLAUDE_PROJECT_DIR"],
    readStdin,
}).then((outcome) => {
    if (outcome.message !== null)
        process.stderr.write(`${outcome.message}\n`);
    process.exit(outcome.exitCode);
});
