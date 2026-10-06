# Style Guide — Polishing Jira and Confluence

Goal: a reader gets the point in ten seconds and finds any detail in thirty. Nothing that
carries information is lost.

## Principles

1. **Keep every fact.** Decisions (with who and when), numbers, names, dates, links, IDs,
   test vectors, open questions. If unsure whether something is a fact, keep it.
2. **Cut everything else.** Padding, repetition, history of how the text got here.
3. **Current state wins.** Comments often supersede the description. The newest dated source
   wins; the older claim is removed, not kept "for context".
4. **Format to aid reading, not to decorate.** Each heading, table or panel must make
   something faster to find. Follow "Restraint (cognitive load)" below.
5. **Same language as the page.** Never translate unless asked. Mixed-language page: use the
   majority language for headings, keep quotes as written.
6. **Never invent.** A fact that can't be verified stays, marked `(unverified)`.

## Remove

| Remove | Replace with |
|--------|--------------|
| Dated correction notes ("Correction 2026-09-28: actually X") | just X, in the right place |
| "Recreated from PROJ-12", "copied from old board" | nothing (the link stays in Links) |
| Context restated from a linked ticket | `Context: PROJ-45` |
| Superseded plan or approach | one line: `Earlier approach (X) dropped — see PROJ-45 / comment 2026-09-10` |
| Filler ("As discussed", "It's worth noting that", "Basically") | nothing |
| Hedging without real uncertainty ("we might possibly want to") | the plain statement |
| Status columns next to ticket keys | bare key; Jira renders live status |
| Secrets (tokens, passwords, private keys) | `<redacted>` and a note in the report |

Keep: IDs, test vectors, public links, real uncertainty ("not yet confirmed by Legal").

## Formatting rules

- **Tables** for anything with ≥ 2 attributes per item. ≤ 5 columns, one line per cell.
- **Monospace** for identifiers, paths, env vars, field names, commands, flags, values.
- **Lists** for parallel items. Numbered only when order matters.
- **Checklists** for acceptance criteria and go-live steps.
- **Headings** start at h2 in Jira. Sentence case. No heading for a single line.
- **Panels** (Confluence only) for at most one or two callouts: a warning that blocks
  action, or a note the reader must not miss.
- **Bold** sparingly: the one word that changes the meaning of the sentence.
- **Ticket keys** bare: `PROJ-123`.
- **Dates** ISO: `2026-10-01`.
- **Status** sections are dated in the heading because they go stale.

## Restraint (cognitive load)

Every markup element must pay for itself: it either helps the reader find something or
carries meaning. If removing it loses nothing, remove it.

- **Plain by default.** Short sentences and paragraphs first; markup only where plain text
  would be harder to scan.
- **One emphasis style per purpose.** Bold = the word that flips the meaning. Monospace =
  literals. Never bold whole sentences, never bold + italic, never ALL CAPS.
- **Emoji = signal, not decoration.** At most 3 per page, only where they mark a category
  the reader scans for (e.g. a risk or a blocker heading), always the same emoji for the same
  meaning, never in body text, tables, lists or inside sentences. A page with no such
  category gets zero.
- **Structure depth ≤ 2.** No nested lists beyond two levels; no headings below h3; no table
  inside a list; no list inside a table cell.
- **Section size.** A heading earns its place with ≥ 2 lines of content. 3+ headings per
  screen of text means over-structured: merge.
- **Lists:** 3-7 items. One item or > 9: write a sentence or group them.
- **Callouts** (panel, quote, blockquote): ≤ 2 per page, only for what blocks action or
  for the TL;DR below.
- **TL;DR callout (Jira):** only when the body holds a size/effort/remaining-work fact or a
  blocker. Open the body with a 1–2 line blockquote: bold lead word (`**TL;DR:**`), or one
  ⚠️ for a blocker only. Never a banner, never a restated goal.
  Blocker = anything that stops an acceptance criterion being met now (design "To do",
  empty plan/spec section, required ticket not started). A blocker always leads the
  callout, ahead of size/effort facts.
- **Horizontal rules, decorative separators:** none, unless the original page's structure
  depends on them.
- **Order for scanning:** what the reader must do or decide first, background last.
- **Grab-bag sections** ("Additional context", "Notes", "Misc"): split by kind of
  information into the template sections. Never keep the bucket.
- **Long route/path lists:** one per bullet, or a 2-column table. Never comma-chained.
- **Single-row tables:** cells hold values only; move explanations to a note under the table.

## Jira template (default)

Reader-priority order. Drop any section that would be empty. Moving original sections into
this order is expected; list every move in REMOVED/CHANGED.

```markdown
> ⚠️ **Blocked:** design not started (status To do, plan section empty).

## Goal
One or two sentences: the outcome, not the activity.

## Acceptance criteria
- [ ] Observable criterion
- [ ] Observable criterion

## Scope
- Rule or scope item
- Out of scope: PROJ-140 (covered there)

## Dependencies & risks
| Ticket | What it touches | Action |
|--------|-----------------|--------|
| PROJ-131 | `src/api/client.ts` | merge-conflict risk: rebase after it lands |

## Planning
| Priority | Effort | Status |
|----------|--------|--------|
| High | 2 | To do |

## Decisions
| Topic | Decision | Source |
|-------|----------|--------|
| Retry policy | 3 retries, exponential backoff | Ana López, 2026-09-12, [thread](https://…) |

## Status (2026-10-01)
- PR [#412](https://…) merged: API endpoint
- Left: UI wiring, PROJ-130

## Open questions
- Who owns the migration rollback? (asked 2026-09-20, no answer)

## Links
- Design: [Figma](https://…)
- Context: PROJ-45

## People
- Owners / reviewers: Ana López, Dani Ruiz
```

Order: TL;DR/blocker → Goal → Acceptance criteria → Scope → Dependencies & risks →
Planning → Links → People. Decisions, Status and Open questions sit right after Planning.
Rename `Scope` to `Rules` when the content is constraints rather than scope. Acceptance
criteria are always `- [ ]` checkboxes unless the user opted out.

## Epic additions

```markdown
## Children
| Area | Key | What | PR |
|------|-----|------|----|
| Backend | PROJ-201 | Webhook receiver | [#88](https://…) |
| Web | PROJ-202 | Settings screen | — |

## Go-live
- [ ] Feature flag `billing_v2` on in staging
- [ ] Runbook linked
- [ ] Support briefed
```

Optional dependency diagram only when order is non-obvious (see formats reference §5). No
status in the children table: keys render live status.

## Confluence pages

- Keep the existing heading hierarchy when it carries meaning (runbook steps, chapters,
  anchors other pages link to). Rename headings only if they are vague ("Misc", "Notes 2").
- Table of contents only for pages with ≥ 6 sections or that scroll more than ~3 screens.
- Panels: at most one or two.
- Don't remove or rewrite macros you don't understand (includes, excerpts, page
  properties, Jira macros). Leave them in place and say so.
- Decision tables and dated status follow the Jira rules.

## Before / after

### Example 1 — Jira story with correction notes

Before:

```text
As discussed in the sync, we need to basically make sure that the export works for big
accounts. Recreated from OPS-77.

The export should be CSV. Correction 2026-09-28: it should be CSV and XLSX, Marta confirmed
in Slack. Limit is 10k rows. EDIT: limit raised to 50k after perf test (Dani, 2026-09-30).

It's worth noting that the field customer_id must be included. Done when export works.
```

After:

```markdown
## Goal
Large accounts can export their data without timeouts.

## Rules
- Formats: CSV and XLSX
- Max `50000` rows per export
- Always include `customer_id`

## Decisions
| Topic | Decision | Source |
|-------|----------|--------|
| Formats | CSV + XLSX | Marta, 2026-09-28, Slack |
| Row limit | 50k (was 10k) | Dani, 2026-09-30, perf test |

## Acceptance criteria
- [ ] 50k-row export completes in both formats
- [ ] `customer_id` present in every row
```

Removed: "As discussed…", "Recreated from OPS-77" (link kept on the issue), correction and
EDIT markers (folded into the decision), "It's worth noting".

### Example 2 — stale status line

Before:

```text
Status: waiting for PR review. Backend done, frontend in progress.
```

Comment 2026-09-29: "FE PR #510 merged, only QA left."

After:

```markdown
## Status (2026-10-01)
- PR [#510](https://…) merged: frontend
- Left: QA
```

Removed: "waiting for PR review" (superseded by the 2026-09-29 comment).

### Example 3 — Confluence page with restated context

Before:

```text
Background
This project started because, as explained in the RFC, the old billing system cannot handle
multiple currencies. The RFC describes three options. We picked option B. Option A was
rejected. Option C was rejected because of cost.
Setup
Set BILLING_URL and run make migrate.
```

After:

```markdown
## Background
Multi-currency billing. Context and options: [Billing RFC](https://…).
Chosen: **option B** (A and C rejected — C on cost).

## Setup
1. Set `BILLING_URL`
2. Run `make migrate`
```

Removed: restated RFC explanation. Kept: the choice and each rejection reason given.

## Removal list (shown in the preview)

One line per removal: `- <what> — <why>`. Reasons from the Remove table only. If nothing was
removed, say so.
