---
name: condense-learnings
description: Condense the learnings backlog by removing unnecessary entries, resolving duplicates, and normalizing tags. Use when the user says "condense learnings", "clean up learnings", "deduplicate learnings", or "organize learnings".
allowed-tools: [Bash]
model: sonnet
---

# Condense Learnings

Review all active learnings and reduce noise: archive stale or redundant entries, merge duplicates into the better one, normalize tags.

## Workflow

### 1. Load All Active Learnings

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-list --json true
```

If the result is empty or fewer than 2 learnings, output: "Nothing to condense." and stop.

### 2. Analyze

Read every learning's `id`, `title`, `tags`, `created`, and `body`. Identify:

**Duplicates** — two learnings covering the same root insight. Keep the one with fuller body or clearer title. Archive the other. Optionally enrich the winner's body or tags if the loser had useful details not present in the winner.

**Stale / superseded** — a learning that was valid once but is now wrong, trivially obvious, or fully covered by a newer, fuller learning. Archive it.

**Tag normalization** — inconsistent forms of the same concept (e.g., `error-handling` vs `errors` vs `error_handling`). Pick the canonical form and update all affected learnings.

**Keep** — anything that provides a non-obvious, still-valid, actionable insight. When in doubt, keep.

### 3. Apply Changes

For each action, call the appropriate CLI command:

**Archive a learning** (duplicate loser or stale entry):
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-move {{ID}} --to archived
```

**Update the winner when merging** (add missing insights from the loser into its body or fix tags):
```bash
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-update {{ID}} --body -
{{MERGED_BODY}}
BODY
```

**Normalize tags on a learning**:
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-update {{ID}} --tags "{{canonical-tag1}},{{canonical-tag2}}"
```

### 4. Rebuild Index

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" index-rebuild --type learnings
```

### 5. Report Summary

Print a concise summary:

```
## Learnings Condensed

**Archived** ({{N}}):
- LRN-XXX: {{title}} — {{reason}}

**Merged into** ({{N}} winners updated):
- LRN-XXX ← absorbed LRN-YYY: {{what was added}}

**Tags normalized** ({{N}}):
- `errors` → `error-handling` on LRN-XXX, LRN-YYY

**Kept unchanged**: {{N}} learnings
```

If no changes were needed, output: "All {{N}} learnings are already well-organized."
