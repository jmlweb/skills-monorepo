---
name: deslop
argument-hint: [base branch]
description: Strips LLM-style comments from the code a branch added, keeping only comments that explain why. Use when the user says "deslop", "remove AI comments", "clean up the comments in my branch", "strip the LLM slop", or "/deslop". Not for auditing docs or Markdown (use check-docs) or reviewing a pull request (use review-pr).
allowed-tools: Read, Edit, Bash(git:*)
model: sonnet
effort: medium
---

# Deslop

Remove comments an LLM added to the current branch that restate code, narrate changes or sell the result.

## Arguments

`$ARGUMENTS` (optional): base branch. Without it the base is resolved in step 1.

## Prerequisites

`git rev-parse --is-inside-work-tree` succeeds and `git diff --quiet` shows no unstaged edits to the files in scope; otherwise tell the user and stop (an Edit on top of unrelated edits is hard to review).

## Workflow

### 1. Resolve the base

Use the first that exists:

1. `$ARGUMENTS`
2. `git rev-parse --abbrev-ref --symbolic-full-name @{upstream}`
3. `git symbolic-ref --short refs/remotes/origin/HEAD`

None exists → ask the user for a base branch and wait.

Done when: one base ref is named in the output.

### 2. Collect added comment lines

```bash
git diff -M --unified=0 <base>...HEAD
```

`-M` detects renames, so a moved file contributes only its changed lines. Keep only `+` lines. Drop files that are generated, vendored or lock files (`dist/`, `build/`, `vendor/`, `node_modules/`, `*.lock`, `pnpm-lock.yaml`, `package-lock.json`, `*.min.*`, files headed `@generated` or "DO NOT EDIT"), and every Markdown file. Within the remaining files, keep added lines that are code comments or doc-comments (`//`, `#`, `/* */`, `/** */`, `--`, docstrings).

Done when: you hold a list of `file:line` added comments, or the list is empty (say so and stop).

### 3. Classify

Flag a comment when it is one of:

- **restates** the next line of code ("// increment counter")
- **boilerplate doc** on an obvious signature (`@param id the id`, `@returns the result`)
- **change-log** ("// updated to fix X", "// now handles Y", "// added for TSK-12")
- **banner** noise (`// ===== Helpers =====`, `// --- end ---`)
- **marketing** tone ("robust", "seamless", "powerful", "elegant")

Keep a comment when it states a reason, an invariant, a workaround with a link or ticket, a non-obvious constraint, or a public API doc that lint requires (check the lint config when a doc-comment looks like boilerplate on exported code).

Pre-existing comments are out of scope: a comment absent from the `+` lines stays untouched.

Done when: every collected comment is marked flag or keep.

### 4. Show one numbered list

One list across all files, grouped under file headings so numbering never restarts. Choosing one list lets the user answer once ("all", "1-4,7", "all but 3").

```
Base: <base>  ·  <N> flagged of <M> added comments

src/a.ts
  1. :12  restates   // increment counter
  2. :30  change-log // updated to fix auth bug
src/b.ts
  3. :5   boilerplate /** @param id the id */
```

Ask which to remove and wait for the answer.

Done when: the user has replied with a selection or "none".

### 5. Apply the selection

Remove only the selected comments with Edit. When a removal leaves a blank doc block or two adjacent blank lines, collapse it. Then run `git diff --stat` to confirm only comment lines changed.

Done when: each selected item is gone and the diff touches no code tokens.

## Output

```
Deslop: removed <K> of <N> flagged comments across <F> files (base <base>)
Kept <M-K> comments. Review with `git diff`; nothing is committed.
```
