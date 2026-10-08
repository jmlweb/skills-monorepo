#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { markdownToAdf } from "../core/md-to-adf.js";
import { readbackToMarkdown } from "../core/readback.js";
import { InvalidArgumentError } from "../core/errors.js";
import { blocking, scanLossy } from "../core/lossy-scan.js";

const EXIT_OK = 0;
const EXIT_FINDINGS = 1;
const EXIT_ERROR = 2;

const HELP = [
  "Usage: atlassian-polish <command> [flags]",
  "",
  "Commands:",
  "  md-to-adf       Convert Markdown to a Jira ADF document (JSON on stdout)",
  "  readback-to-md  Turn MCP <custom> smart-link/mention tags back into keys and",
  "                  [@Name](mention:<id>) (Markdown on stdout)",
  "  lossy-scan      List Jira nodes a Markdown rewrite would drop (JSON on stdout).",
  "                  Exit 1 if any is not re-created by readback-to-md, else 0",
  "",
  "md-to-adf flags:",
  "  --file <path>   Read Markdown from a file (default: stdin)",
  "  --pretty true   Indent the JSON (default: compact, one line)",
  "  --jira-base <url> --projects <A,B>",
  "                  Link bare issue keys of those projects (e.g. https://acme.atlassian.net, PROJ,OPS)",
  "",
  "readback-to-md flags:",
  "  --file <path>   Markdown as the MCP returned it (default: stdin)",
  "  --html <path>   renderedFields.description from the same fetch (required)",
  "",
  "lossy-scan flags (at least one):",
  "  --file <path>   Markdown as the MCP returned it",
  "  --html <path>   renderedFields.description",
  "  --adf <path>    ADF JSON from REST v3 (the most reliable source)",
].join("\n");

function parseFlags(args: readonly string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) continue;
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      flags[arg.slice(2)] = next;
      i++;
    } else {
      flags[arg.slice(2)] = "true";
    }
  }
  return flags;
}

function main(): number {
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
    if (command !== "md-to-adf" && command !== "readback-to-md" && command !== "lossy-scan") {
      throw new InvalidArgumentError(`Unknown command: ${command}`);
    }
    const flags = parseFlags(rest);
    if (command === "lossy-scan") {
      const read = (flag: string): string | undefined => {
        const path = flags[flag];
        return path === undefined ? undefined : readFileSync(path, "utf-8");
      };
      const markdown = read("file");
      const html = read("html");
      const adf = read("adf");
      const findings = scanLossy({
        ...(markdown !== undefined && { markdown }),
        ...(html !== undefined && { html }),
        ...(adf !== undefined && { adf }),
      });
      const open = blocking(findings);
      console.log(JSON.stringify({ findings, blocking: open.length }, null, 2));
      return open.length > 0 ? EXIT_FINDINGS : EXIT_OK;
    }
    // fd 0 read keeps the CLI synchronous and dependency-free.
    const markdown = readFileSync(flags["file"] ?? 0, "utf-8");
    if (command === "readback-to-md") {
      const html = flags["html"];
      if (!html) throw new InvalidArgumentError("readback-to-md needs --html <path>");
      process.stdout.write(readbackToMarkdown(markdown, readFileSync(html, "utf-8")));
      return EXIT_OK;
    }
    const base = flags["jira-base"];
    const projects = flags["projects"]?.split(",").map((p) => p.trim()).filter(Boolean);
    if ((base === undefined) !== (projects === undefined)) {
      throw new InvalidArgumentError("--jira-base and --projects must be used together");
    }
    const doc = markdownToAdf(
      markdown,
      base && projects ? { issueLinks: { baseUrl: base, projects } } : {},
    );
    console.log(
      flags["pretty"] === "true"
        ? JSON.stringify(doc, null, 2)
        : JSON.stringify(doc),
    );
    return EXIT_OK;
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return EXIT_ERROR;
  }
}

process.exit(main());
