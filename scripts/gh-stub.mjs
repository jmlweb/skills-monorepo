#!/usr/bin/env node
// A stand-in for the GitHub CLI used by the flowstate GitHub-backend tests, so no test
// needs the network or a token. State is one JSON file named by GH_STUB_STATE:
//
//   { "repo": "owner/name", "auth": true, "nextNumber": 1,
//     "labels": ["flowstate:task"], "issues": [ { number, title, body, labels, state, url, isPullRequest } ] }
//
// It answers the subcommands the store and setup use (`auth status`, `repo view`,
// `label list|create`, `issue list|view|create|edit|close|reopen`) with gh's real output
// shapes and error lines, and appends every argv to GH_STUB_STATE + ".log" so a test can
// assert how many calls a store operation made. Anything else exits 1 like gh would.
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

// Helper for tests: writes an executable `gh` shim into `dir`; put `dir` first on PATH.
export function installStub(dir) {
  const shim = `#!/bin/sh\nexec node "${fileURLToPath(import.meta.url)}" "$@"\n`;
  writeFileSync(`${dir}/gh`, shim, { mode: 0o755 });
}

export const emptyState = (repo = "owner/name") => ({
  repo,
  auth: true,
  nextNumber: 1,
  labels: [],
  issues: [],
});

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function loadState(path) {
  if (!path) fail("gh-stub: GH_STUB_STATE is not set", 2);
  if (!existsSync(path)) fail(`gh-stub: state file ${path} does not exist`, 2);
  return JSON.parse(readFileSync(path, "utf-8"));
}

const saveState = (path, state) => writeFileSync(path, JSON.stringify(state, null, 2));

// gh accepts `--flag value`, repeated flags and comma-separated label lists.
function parseFlags(args) {
  const flags = {};
  const lists = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("-")) {
      positional.push(arg);
      continue;
    }
    const key = arg.replace(/^-+/, "");
    const next = args[i + 1];
    // "-" alone is a value (`--body-file -` means stdin).
    const takesValue = next !== undefined && (next === "-" || !next.startsWith("-")) && !["force", "web"].includes(key);
    const value = takesValue ? next : "true";
    if (takesValue) i++;
    flags[key] = value;
    (lists[key] ??= []).push(...(["label", "l", "add-label", "remove-label"].includes(key) ? value.split(",") : [value]));
  }
  return { flags, lists, positional };
}

const issueUrl = (repo, issue) => `https://github.com/${repo}/${issue.isPullRequest ? "pull" : "issues"}/${issue.number}`;

function serializeIssue(issue, repo, fields) {
  const full = {
    number: issue.number,
    title: issue.title,
    body: issue.body ?? "",
    labels: issue.labels.map((name) => ({ id: `L_${name}`, name, description: "", color: "ededed" })),
    state: issue.state,
    stateReason: issue.stateReason ?? null,
    url: issueUrl(repo, issue),
    isPinned: false,
  };
  return Object.fromEntries(fields.map((f) => [f, full[f]]));
}

function requireRepo(state, flags) {
  const repo = flags.repo ?? flags.R;
  if (repo !== undefined && repo !== state.repo) {
    fail(`GraphQL: Could not resolve to a Repository with the name '${repo}'. (repository)`);
  }
  return state.repo;
}

function requireLabels(state, names) {
  for (const name of names) {
    if (!state.labels.includes(name)) fail(`could not add label: '${name}' not found`);
  }
}

function findIssue(state, raw) {
  const number = Number(raw);
  const issue = state.issues.find((i) => i.number === number);
  if (!issue) fail(`GraphQL: Could not resolve to an issue or pull request with the number of ${raw}. (repository.issue)`);
  return issue;
}

function readStdin() {
  try {
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

export function main(argv, env = process.env) {
  const statePath = env.GH_STUB_STATE;
  if (statePath) appendFileSync(`${statePath}.log`, `${JSON.stringify(argv)}\n`);
  const [group, action, ...rest] = argv;
  const { flags, lists, positional } = parseFlags(rest);

  if (group === "--version") {
    process.stdout.write("gh version 0.0.0-stub\n");
    return;
  }

  const state = loadState(statePath);

  if (group === "auth" && action === "status") {
    if (!state.auth) fail("You are not logged into any GitHub hosts. To log in, run: gh auth login");
    process.stdout.write(`github.com\n  ✓ Logged in to github.com account stub (keyring)\n`);
    return;
  }

  if (group === "repo" && action === "view") {
    const target = positional[0];
    if (target !== undefined && target !== state.repo) {
      fail(`GraphQL: Could not resolve to a Repository with the name '${target}'. (repository)`);
    }
    if (!state.auth) fail("To get started with GitHub CLI, please run:  gh auth login");
    process.stdout.write(JSON.stringify({ nameWithOwner: state.repo }) + "\n");
    return;
  }

  if (group === "label" && action === "list") {
    requireRepo(state, flags);
    process.stdout.write(JSON.stringify(state.labels.map((name) => ({ name }))) + "\n");
    return;
  }

  if (group === "label" && action === "create") {
    requireRepo(state, flags);
    const name = positional[0];
    if (!name) fail("gh-stub: label create needs a name");
    if (state.labels.includes(name) && flags.force !== "true") fail(`label with name "${name}" already exists; use \`--force\` to update its color and description`);
    if (!state.labels.includes(name)) state.labels.push(name);
    saveState(statePath, state);
    process.stdout.write(`✓ Label "${name}" created in ${state.repo}\n`);
    return;
  }

  if (group === "issue" && action === "list") {
    const repo = requireRepo(state, flags);
    const wanted = (flags.state ?? flags.s ?? "open").toUpperCase();
    const limit = Number(flags.limit ?? flags.L ?? 30);
    const labels = [...(lists.label ?? []), ...(lists.l ?? [])];
    const fields = (flags.json ?? "number,title").split(",");
    const matches = state.issues
      .filter((i) => !i.isPullRequest)
      .filter((i) => wanted === "ALL" || i.state === wanted)
      .filter((i) => labels.every((name) => i.labels.includes(name)))
      .sort((a, b) => b.number - a.number)
      .slice(0, limit);
    process.stdout.write(JSON.stringify(matches.map((i) => serializeIssue(i, repo, fields))) + "\n");
    return;
  }

  if (group === "issue" && action === "view") {
    const repo = requireRepo(state, flags);
    const issue = findIssue(state, positional[0]);
    const fields = (flags.json ?? "number,title").split(",");
    process.stdout.write(JSON.stringify(serializeIssue(issue, repo, fields)) + "\n");
    return;
  }

  if (group === "issue" && action === "create") {
    const repo = requireRepo(state, flags);
    const labels = [...(lists.label ?? []), ...(lists.l ?? [])];
    requireLabels(state, labels);
    const body = flags["body-file"] === "-" ? readStdin() : (flags.body ?? flags.b ?? "");
    const issue = { number: state.nextNumber++, title: flags.title ?? flags.t ?? "", body, labels, state: "OPEN", stateReason: null };
    state.issues.push(issue);
    saveState(statePath, state);
    process.stdout.write(`${issueUrl(repo, issue)}\n`);
    return;
  }

  if (group === "issue" && action === "edit") {
    const repo = requireRepo(state, flags);
    const issue = findIssue(state, positional[0]);
    const add = lists["add-label"] ?? [];
    const remove = lists["remove-label"] ?? [];
    requireLabels(state, add);
    if (flags.title !== undefined) issue.title = flags.title;
    if (flags["body-file"] === "-") issue.body = readStdin();
    else if (flags.body !== undefined) issue.body = flags.body;
    issue.labels = [...issue.labels.filter((name) => !remove.includes(name)), ...add.filter((name) => !issue.labels.includes(name))];
    saveState(statePath, state);
    process.stdout.write(`${issueUrl(repo, issue)}\n`);
    return;
  }

  if (group === "issue" && (action === "close" || action === "reopen")) {
    const repo = requireRepo(state, flags);
    const issue = findIssue(state, positional[0]);
    const target = action === "close" ? "CLOSED" : "OPEN";
    if (issue.state === target) {
      process.stderr.write(`! Issue #${issue.number} (${issue.title}) is already ${target.toLowerCase()}\n`);
      return;
    }
    issue.state = target;
    issue.stateReason = action === "close" ? (flags.reason ?? "completed").toUpperCase().replace(" ", "_") : "REOPENED";
    saveState(statePath, state);
    process.stdout.write(`✓ ${action === "close" ? "Closed" : "Reopened"} issue ${issueUrl(repo, issue)}\n`);
    return;
  }

  fail(`gh-stub: unsupported command: ${argv.join(" ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
