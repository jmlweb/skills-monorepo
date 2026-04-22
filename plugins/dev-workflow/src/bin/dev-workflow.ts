#!/usr/bin/env node

import {
  getCurrentBranch,
  getStagedDiff,
  getStagedFiles,
} from "../core/git.js";
import { scanSecrets, type Finding } from "../commands/scan-secrets.js";
import {
  detectScope,
  readPackageNameFromDisk,
} from "../commands/detect-scope.js";
import { detectPackages } from "../commands/detect-packages.js";
import {
  generateUniqueChangesetName,
  listChangesetNames,
} from "../commands/changeset-name.js";
import { readPackageInfo } from "../core/packages.js";

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
    console.error(
      [
        "Usage: dev-workflow <command> [flags]",
        "",
        "Commands:",
        "  scan-secrets     Scan staged changes for secrets and sensitive files",
        "  detect-scope     Suggest a Conventional Commits scope from staged files and branch",
        "  detect-packages  List workspace packages touched by staged files",
        "  changeset-name   Generate an unused adjective-noun-verb name for .changeset/",
      ].join("\n"),
    );
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
      case "detect-scope": {
        const files = flags["files"]
          ? flags["files"]
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean)
          : getStagedFiles(cwd);
        const branch = flags["branch"] ?? getCurrentBranch(cwd);
        const result = detectScope(files, branch, (ws, dir) =>
          readPackageNameFromDisk(cwd, ws, dir),
        );
        if (json) {
          console.log(JSON.stringify(result, null, 2));
        } else if (result.suggested) {
          console.log(result.suggested);
        }
        return EXIT_CLEAN;
      }
      case "detect-packages": {
        const files = flags["files"]
          ? flags["files"]
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean)
          : getStagedFiles(cwd);
        const includePrivate = flags["include-private"] === "true";
        const packages = detectPackages(
          files,
          (relDir) => readPackageInfo(cwd, relDir),
          { includePrivate },
        );
        if (json) {
          console.log(JSON.stringify({ packages }, null, 2));
        } else {
          for (const p of packages) {
            console.log(p.name);
          }
        }
        return EXIT_CLEAN;
      }
      case "changeset-name": {
        const dir = flags["dir"] ?? ".changeset";
        const existing = listChangesetNames(cwd, dir);
        const name = generateUniqueChangesetName((n) => !existing.has(n));
        const path = `${dir}/${name}.md`;
        if (json) {
          console.log(JSON.stringify({ name, path }, null, 2));
        } else {
          console.log(path);
        }
        return EXIT_CLEAN;
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
