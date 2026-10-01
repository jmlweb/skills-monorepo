#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { markdownToAdf } from "../core/md-to-adf.js";
import { InvalidArgumentError } from "../core/errors.js";
const EXIT_OK = 0;
const EXIT_ERROR = 2;
const HELP = [
    "Usage: atlassian-polish <command> [flags]",
    "",
    "Commands:",
    "  md-to-adf    Convert Markdown to a Jira ADF document (JSON on stdout)",
    "",
    "md-to-adf flags:",
    "  --file <path>   Read Markdown from a file (default: stdin)",
    "  --pretty true   Indent the JSON (default: compact, one line)",
].join("\n");
function parseFlags(args) {
    const flags = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (!arg.startsWith("--"))
            continue;
        const next = args[i + 1];
        if (next && !next.startsWith("--")) {
            flags[arg.slice(2)] = next;
            i++;
        }
        else {
            flags[arg.slice(2)] = "true";
        }
    }
    return flags;
}
function main() {
    const [command, ...rest] = process.argv.slice(2);
    if (!command || command === "--help" || command === "-h") {
        console.error(HELP);
        return command ? EXIT_OK : EXIT_ERROR;
    }
    if (rest.includes("--help") || rest.includes("-h")) {
        console.error(HELP);
        return EXIT_OK;
    }
    try {
        if (command !== "md-to-adf") {
            throw new InvalidArgumentError(`Unknown command: ${command}`);
        }
        const flags = parseFlags(rest);
        // fd 0 read keeps the CLI synchronous and dependency-free.
        const markdown = readFileSync(flags["file"] ?? 0, "utf-8");
        const doc = markdownToAdf(markdown);
        console.log(flags["pretty"] === "true"
            ? JSON.stringify(doc, null, 2)
            : JSON.stringify(doc));
        return EXIT_OK;
    }
    catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        return EXIT_ERROR;
    }
}
process.exit(main());
