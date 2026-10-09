---
name: condense-learnings
description: Dedupes, retags and compresses the learnings backlog.
disable-model-invocation: true
allowed-tools: [Bash, Read]
model: sonnet
effort: medium
---

# Condense Learnings

Two passes over `learnings/`:

1. **Curation** — archive duplicates / stale entries, normalize tags.
2. **Caveman compression** — rewrite the body of each remaining active learning terse. Sets `compressed: true` on success.

## Workflow

### 1. Pass 1 — curation

Load all active learnings:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-list --json true
```

If empty or fewer than 2: skip Pass 1, go straight to Pass 2.

Read each learning's `id`, `title`, `tags`, `created`, and `body`. Identify:

- **Duplicates** — same root insight. Keep the one with fuller body or clearer title. Archive the other. Optionally enrich the winner from the loser's content.
- **Stale / superseded** — was valid once, now wrong, trivially obvious, or fully covered elsewhere. Archive.
- **Tag normalization** — `error-handling` vs `errors` vs `error_handling` → pick canonical, update all.
- **Keep** — non-obvious, still valid, actionable. When in doubt, keep.

Apply each action:

```bash
# Archive a learning (duplicate loser or stale entry):
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-move {{ID}} --to archived

# Update the winner when merging (add missing insights from the loser):
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-update {{ID}} --body -
{{MERGED_BODY}}
BODY

# Normalize tags:
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-update {{ID}} --tags "{{canonical-tag1}},{{canonical-tag2}}"
```

Rebuild the index:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" index-rebuild --type learnings
```

Done when: every learning is classified keep, archive, merge or retag, and the index is rebuilt.

### 2. Pass 2 — caveman compress each remaining active learning

Reload the active list (curation may have changed it):

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-list --json true
```

For each learning:

1. **Read** the file at `{{BACKLOG}}/learnings/{{id}}-{{slug}}/index.md` with the `Read` tool. Skip if frontmatter has `compressed: true`. (`{{BACKLOG}}` = output of `node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" path`)
2. **Rewrite the body** following the caveman rules below. Rewrite only the body below the frontmatter.
3. **Pipe** to `learning-compress`:

```bash
cat <<'BODY' | node "${CLAUDE_PLUGIN_ROOT}/dist/bin/flowstate.js" learning-compress {{ID}} --body - --json true
{{COMPRESSED_BODY}}
BODY
```

Exit code `0` = success, `2` = invariant failure (JSON `errors` lists missing tokens). File untouched on failure.

4. **On invariant failure** — retry **once**, using the diagnostics (e.g. "missing LRN-014"). A second failure is logged and skipped; the file stays as it was.

Done when: every uncompressed active learning has exit 0, or a logged second failure.

### 3. Caveman compression rules

Before the first rewrite, read `${CLAUDE_PLUGIN_ROOT}/shared/caveman-compression.md`; it lists what to drop, what must stay byte-exact, and an example.

### 4. Report Summary

```
## Learnings Condensed

**Pass 1 — curation**
- Archived ({{N}}): LRN-XXX: {{title}} — {{reason}}
- Merged into ({{N}} winners updated): LRN-XXX ← absorbed LRN-YYY
- Tags normalized ({{N}}): `errors` → `error-handling` on LRN-XXX, LRN-YYY

**Pass 2 — caveman compress** ({{N}} touched):
- LRN-XXX: {{title}} — saved {{bytes}} bytes

**Skipped — already compressed** ({{N}})
**Failed validation** ({{N}}):
- LRN-XXX: {{first error}}

Total bytes saved: {{TOTAL}}
```

If nothing changed: `All {{N}} learnings are already curated and compressed.`

## Notes

- Both passes are idempotent. Curation can run repeatedly without re-archiving the same entries; `compressed: true` blocks re-compress.
- Validation rejects rewrites that drop load-bearing tokens or reorder headings. Original preserved on failure.
- Pass 1 is the right place to reshape semantics; Pass 2 only compresses prose, never paraphrases away meaning.
