#!/usr/bin/env node

import { getStagedDiff, getStagedFiles } from "../core/git.js";
import { scanSecrets, type Finding } from "../commands/scan-secrets.js";

const EXIT_CLEAN = 0;
const EXIT_FINDINGS = 1;
const EXIT_ERROR = 2;

function parseFlags(args: readonly string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = "true";
    }
  }
  return flags;
}

function printHuman(findings: readonly Finding[]): void {
  if (findings.length === 0) {
    console.log("No secrets detected in staged changes.");
    return;
  }
  console.log(`Found ${findings.length} potential secret(s) in staged changes:\n`);
  for (const f of findings) {
    const location = f.line !== undefined ? `${f.file}:${f.line}` : f.file;
    const preview = f.preview ? `  ${f.preview}` : "";
    console.log(`  [${f.reason}] ${f.pattern} — ${location}`);
    if (preview) console.log(preview);
  }
  console.log(
    "\nReview each finding. Unstage or redact before committing if confirmed.",
  );
}

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === "--help" || command === "-h") {
    console.error("Usage: dev-workflow <command> [flags]\n\nCommands:\n  scan-secrets   Scan staged changes for secrets and sensitive files");
    return command ? EXIT_CLEAN : EXIT_ERROR;
  }

  const flags = parseFlags(rest);
  const json = flags["json"] === "true";
  const cwd = flags["cwd"] ?? process.cwd();

  try {
    switch (command) {
      case "scan-secrets": {
        const result = scanSecrets(getStagedFiles(cwd), getStagedDiff(cwd));
        if (json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          printHuman(result.findings);
        }
        return result.findings.length > 0 ? EXIT_FINDINGS : EXIT_CLEAN;
      }
      default:
        console.error(`Unknown command: ${command}`);
        return EXIT_ERROR;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (json) {
      console.error(JSON.stringify({ error: message }));
    } else {
      console.error(`Error: ${message}`);
    }
    return EXIT_ERROR;
  }
}

main().then((code) => {
  process.exit(code);
});
