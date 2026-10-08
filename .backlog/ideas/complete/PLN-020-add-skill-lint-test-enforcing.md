---
id: PLN-020
title: Add skill lint test enforcing the skill quality bar
status: approved
created: 2026-10-08
complexity: medium
reviewed: 2026-10-08
task-id: TSK-038
---

## Goal
Turn the AGENTS.md "New or edited skill" quality bar into a test that runs in `pnpm test`. Start in warn mode, so it can land before the writing-rules audits; switch to strict once they finish.

## Context
Source: the review of agent-skill repos (2026-10-08). All five repos enforce skill structure with a script, not prose:
- obra/superpowers `tests/diagnosing-superpowers/test-skill-structure.sh`: description prefix, 1024-char cap, word budget.
- addyosmani/agent-skills `scripts/lib/skill-lint.js`: required sections, frontmatter key allowlist. Lint exemptions live in the validator, not in skill frontmatter.
- addyosmani `scripts/validate-artifact-paths.js`: producer/consumer drift check between skills.
- affaan-m/ECC `scripts/ci/validate-skills.js`: warns by default, errors with `--strict`, so legacy cleanup can happen gradually.
- affaan-m/ECC `scripts/ci/catalog.js --check`: generated tables are drift-checked against the skill dirs.
- anthropics/skills `skills/skill-creator/scripts/quick_validate.py`: key allowlist, kebab-case name ≤64 chars, description ≤1024 chars.

Today the only skill-related test is `plugins/flowstate/src/plugin.test.ts`, which checks version sync. The quality bar is enforced by hand, and the current tree already breaks it:
- Fewer than 3 quoted trigger phrases: flowstate `check-task`, `parallel`; dev-workflow `commit`, `changeset`, `check-docs`.
- Over the 150-line ceiling: atlassian-polish `polish-atlassian` (243 lines).

Frontmatter keys in use across 31 SKILL.md files: `name`, `description`, `argument-hint`, `allowed-tools`, `model`, `effort`, plus `version` in flowstate's root SKILL.md. TSK-028 adds `disable-model-invocation`. Model tiering is consistent today: haiku without effort ×11, sonnet/medium ×18, sonnet/high ×1. The lint keeps it that way.

The skills call the CLIs: about 25 distinct `flowstate.js` subcommands, plus `dev-workflow.js` and `atlassian-polish.js` subcommands. No drift exists today, but nothing guards it: renaming a CLI command breaks a skill silently.

## Approach
1. Create `scripts/lint-skills.mjs`, zero dependencies, with a hand-rolled frontmatter reader (flat `key: value` lines are enough). It globs `plugins/*/skills/*/SKILL.md`, `plugins/flowstate/SKILL.md` and `.claude/skills/*/SKILL.md`, and returns findings `{ file, rule, message, severity }`.
2. Rules:
   1. `name` == directory name (the root SKILL.md is exempt).
   2. Frontmatter keys come from an allowlist: `name, description, argument-hint, allowed-tools, model, effort, disable-model-invocation`, plus `version` for the flowstate root SKILL.md only.
   3. Description: ≤1024 chars, single-line scalar, ≥3 quoted trigger phrases. Skills with `disable-model-invocation: true` are exempt from the trigger count and must be one line (this absorbs TSK-028 step 8).
   4. Body ≤150 lines.
   5. Model tier: `haiku` has no `effort`; `sonnet` requires `effort` ∈ {medium, high}.
   6. Every mention of a `shared/` or `references/` file is a `${CLAUDE_PLUGIN_ROOT}/...` path, or the skill states that prefix for it elsewhere in the body. Bare relative paths don't resolve from the user's cwd.
   7. Skill↔CLI contract: every `<bin>.js" <cmd>` in a skill names a subcommand the binary knows. Get the list by spawning `node plugins/<p>/dist/bin/<bin>.js --help` and parsing it, not by regex over `src/` (atlassian-polish dispatches with `if`, flowstate and dev-workflow with `switch`).
   8. README drift: every skill dir is mentioned in its plugin README as `/plugin:name` or bare `/name`, in a heading or a table row, and every such mention maps to an existing skill. flowstate and atlassian-polish use command tables; dev-workflow has none (per-skill `### \`/commit\`` headings plus a Requirements table).
3. Severity: each rule declares `warn` or `error`. Structural rules (missing SKILL.md, unreadable frontmatter, name mismatch, CLI contract, README drift) are errors from day one. Size, trigger count and path-prefix rules start as warnings. `--strict` promotes every warning to an error. Exemptions are a map inside the script, never a frontmatter key.
4. Add `scripts/lint-skills.test.mjs` (`node:test`, temp-dir fixtures with real files). Each rule gets a passing and a failing fixture, plus one test that runs the lint on the real repo with zero errors. It runs under the existing `test:scripts` glob.
5. Add a root script `lint:skills` and a CI step `pnpm lint:skills` (non-strict for now). Note in the TSK-033..035 tasks that each audit ends by promoting its plugin's warnings, and a follow-up flips CI to `--strict`.
6. AGENTS.md: point the "New or edited skill" quality bar at `pnpm lint:skills` instead of listing the mechanical checks by hand. Update `.claude/skills/new-skill` to run it.
7. Fix the 5 trigger-count warnings right away (descriptions only, patch bumps). Leave `polish-atlassian` length to TSK-035.

## Files to Modify
- `scripts/lint-skills.mjs` — new lint script
- `scripts/lint-skills.test.mjs` — new node:test suite with fixtures
- `package.json` — `lint:skills` script
- `.github/workflows/ci.yml` — lint step (`dist/` is committed, so the `--help` contract check needs no build; the dist-drift gate covers staleness)
- `AGENTS.md` — quality bar points to the lint
- `.claude/skills/new-skill/SKILL.md` — run the lint as the final check
- `plugins/flowstate/skills/check-task/SKILL.md`, `plugins/flowstate/skills/parallel/SKILL.md` — add trigger phrases
- `plugins/dev-workflow/skills/commit/SKILL.md`, `plugins/dev-workflow/skills/changeset/SKILL.md`, `plugins/dev-workflow/skills/check-docs/SKILL.md` — add trigger phrases
- `.backlog/tasks/pending/TSK-028-*`, `TSK-033/034/035-*` — note via `task-update` that the lint absorbs TSK-028 step 8 and gates the audits

## Risks & Considerations
- The hand-rolled frontmatter reader must tolerate the quoted descriptions in use. Keep it to flat keys and fail loudly on anything else (LRN-001: no silent fallback).
- The trigger-count regex counts any quoted string. A description quoting a filename would inflate the count. Accept this; the routing-eval idea measures real routing.
- Collision with TSK-028, which edits the same descriptions: land the lint first so TSK-028 is checked by it.

## Open Questions
- Should repo-local `.claude/skills` follow the same 150-line ceiling? `new-plugin` is 146 lines today, so it passes either way.

## Revision History
- [2026-10-08] README rule matches headings or table rows (dev-workflow has no command table); dropped the built-dist risk, since dist/ is committed and the dist-drift gate covers staleness.
