# The `docs/verify-ui.md` contract

`/dev-workflow:verify-ui` reads one file in the project, `docs/verify-ui.md`, and measures the
running app against it. The skill never writes this file; the project owns it. This page is the
format, with one worked example at the end.

The contract answers five questions: where the app runs, which pages matter, at which sizes,
what must hold on each, and which gaps are already known. Everything project-specific lives
here, so the skill and the agent stay generic.

## Sections

Headings are matched by name, case-insensitive. Keep the five below; add prose anywhere.

### `## App`

A list with three keys:

| Key | Required | Meaning |
|-----|----------|---------|
| `Base URL` | yes | Origin the surfaces are relative to, such as `http://localhost:3000` |
| `Start` | yes | Shell command that starts the dev server from the project root, such as `pnpm dev` |
| `Ready when` | no | How the skill knows the server is up. Default: an HTTP 2xx or 3xx from the base URL. Alternatives: `GET /health returns 200`, or `text "Welcome" appears on /` |

The skill probes the base URL first and runs `Start` only when the probe fails. It waits for
`Ready when` for up to 60 seconds, then stops with the last error.

### `## Surfaces`

One table, one row per page or state worth checking:

| Column | Required | Meaning |
|--------|----------|---------|
| `Surface` | yes | Short name used in the report, such as `Home` or `Checkout empty` |
| `Path` | yes | Path relative to the base URL. Query strings and hashes are fine |
| `Scope` | no | Comma-separated globs of source files that render this surface. The skill maps a diff to surfaces through this column; a surface without one is checked on every run |
| `Setup` | no | Steps the agent performs before measuring, in plain words: `click "Add to cart"`, `press Escape`, `hover .menu`. Keep each surface's setup to a few steps; a long flow belongs in an end-to-end test |

### `## Viewports`

One table, one row per size. Every surface is measured at every viewport unless an invariant
narrows it.

| Column | Required | Meaning |
|--------|----------|---------|
| `Viewport` | yes | Name used in the report, such as `mobile` or `desktop` |
| `Size` | yes | `<width>x<height>` in CSS pixels, such as `390x844` |
| `Emulate` | no | Extra emulation the agent applies: `dark`, `light`, `reduced-motion`, `touch` |

### `## Invariants`

One table, one row per check. The agent runs each row as a script in the page and compares the
result with `Expected`. A row that cannot be expressed as a script is not an invariant; put the
visual expectation in prose and the agent reports it under *Skipped*.

| Column | Required | Meaning |
|--------|----------|---------|
| `ID` | yes | Stable identifier, such as `INV-001`. The `PENDING` and `KNOWN` lists refer to it |
| `Surface` | yes | A surface name, several separated by commas, or `all` |
| `Viewport` | yes | A viewport name, several separated by commas, or `all` |
| `Check` | yes | What is measured, as a JavaScript expression evaluated in the page, or one of the shorthands below |
| `Expected` | yes | The value the expression must produce, as text. Numbers may carry a tolerance: `48px ±1`, `0.5 ±0.05`. A regular expression goes between slashes: `/^Welcome/` |
| `Why` | no | The reason the invariant exists. It appears in the report next to a `FAIL`, so a reader knows what broke |

Shorthands for `Check`, expanded by the agent:

| Shorthand | Expands to |
|-----------|------------|
| `css <selector> <property>` | `getComputedStyle(document.querySelector(<selector>))[<property>]` on the first match |
| `count <selector>` | `document.querySelectorAll(<selector>).length` |
| `text <selector>` | Trimmed `textContent` of the first match |
| `rect <selector> <width\|height\|x\|y>` | The named field of `getBoundingClientRect()` on the first match, rounded to one decimal |
| `overflow-x` | `document.documentElement.scrollWidth <= window.innerWidth`, expected `true`: no horizontal scroll |
| `console` | Count of console messages of type `error` since navigation, expected `0` |
| `title` | `document.title` |

A selector that matches nothing produces the measured value `(no match)`, which fails any
expectation except `(no match)` itself.

The agent always adds a `console` check per surface and viewport when the table does not list
one, so a page that throws on load never reads as clean.

### `## Pending`

Invariants that are expected to fail right now because the work is not finished. A failing row
listed here reports as `PENDING`, not `FAIL`. A passing row listed here reports as `PASS` with
the note `listed as pending`, so the list can be pruned.

| Column | Required | Meaning |
|--------|----------|---------|
| `ID` | yes | An invariant ID, or `<ID>@<surface>` / `<ID>@<surface>@<viewport>` to narrow it |
| `Reason` | yes | What is unfinished |
| `Until` | no | A date, task ID or milestone after which the entry should be gone |

### `## Known`

Invariants that fail for an accepted reason: a third-party widget, a browser bug, a design
decision that overrides the rule on one surface. A failing row listed here reports as `KNOWN`.
A passing row listed here reports as `PASS` with the note `listed as known`.

| Column | Required | Meaning |
|--------|----------|---------|
| `ID` | yes | Same forms as in `Pending` |
| `Reason` | yes | Why the failure is accepted |
| `Tracked in` | no | Issue, task or ADR reference |

A console error accepted on purpose is listed by message pattern instead of ID:
`console:/ResizeObserver loop/`. The agent drops matching messages from the `console` count.

## The report

The agent returns one table, rows ordered `FAIL`, `PENDING`, `KNOWN`, `PASS`, then a
*Skipped* list and a verdict line. The skill relays all three unchanged.

```
| Status  | ID      | Surface | Viewport | Expected   | Measured   | Note                    |
|---------|---------|---------|----------|------------|------------|-------------------------|
| FAIL    | INV-003 | Home    | mobile   | true       | false      | page scrolls sideways   |
| PENDING | INV-007 | Pricing | all      | 3          | 2          | third tier ships in TSK-12 |
| KNOWN   | INV-002 | Home    | desktop  | 48px ±1    | 44px       | brand font, ADR-004     |
| PASS    | INV-001 | Home    | all      | /^Welcome/ | Welcome to | —                       |

Skipped:
- INV-009 · Checkout empty · setup step `click "Add to cart"` found no such button
- Checkout · desktop · render control failed: body has 0 elements after 10s

VERDICT: 1 FAIL, 1 PENDING, 1 KNOWN, 1 PASS, 2 skipped
```

A `Skipped` entry is a check that did not run. It is never folded into `PASS`: a narrowed run
that reads as clean hides the one regression it did not reach.

Before measuring a surface, the agent runs a render control: the body must hold at least one
element and the page text must not be a bare error page. A surface that fails the control is
skipped whole, with the reason, rather than producing `PASS` rows from an empty document.

## Scope

The skill decides which surfaces to measure:

1. An argument naming surfaces (`Home, Pricing`) selects those.
2. An argument naming paths or globs selects every surface whose `Scope` column matches.
3. No argument: the changed files from `git diff` (working tree against `HEAD`, or the branch
   against its merge base when the tree is clean) are matched against `Scope`.
4. A diff that matches no `Scope`, or a contract with no `Scope` column at all, selects every
   surface. The report says which rule applied.

Surfaces outside the scope are not measured and are not listed as skipped: the scope line in
the report names them once.

## Worked example

```markdown
# UI verification contract

## App

- Base URL: http://localhost:3000
- Start: pnpm dev
- Ready when: text "Acme" appears on /

## Surfaces

| Surface  | Path      | Scope                                   | Setup                 |
|----------|-----------|-----------------------------------------|-----------------------|
| Home     | /         | src/app/page.tsx, src/components/hero/** |                       |
| Pricing  | /pricing  | src/app/pricing/**                      |                       |
| Menu open| /         | src/components/nav/**                   | click [aria-label="Menu"] |

## Viewports

| Viewport | Size     | Emulate |
|----------|----------|---------|
| mobile   | 390x844  |         |
| desktop  | 1440x900 |         |
| dark     | 1440x900 | dark    |

## Invariants

| ID      | Surface   | Viewport | Check                         | Expected   | Why                          |
|---------|-----------|----------|-------------------------------|------------|------------------------------|
| INV-001 | all       | all      | title                         | /Acme/     | brand in every tab           |
| INV-002 | Home      | desktop  | css h1 font-size              | 48px ±1    | type scale, ADR-004          |
| INV-003 | all       | mobile   | overflow-x                    | true       | no sideways scroll on phones |
| INV-004 | Pricing   | all      | count [data-tier]             | 3          | three tiers in the catalogue |
| INV-005 | Menu open | mobile   | css nav[aria-expanded] display| flex       | menu visible after tap       |
| INV-006 | all       | dark     | css body background-color     | rgb(17, 17, 17) | dark theme token        |

## Pending

| ID             | Reason                       | Until   |
|----------------|------------------------------|---------|
| INV-004        | third tier ships with TSK-12 | TSK-12  |

## Known

| ID                          | Reason                               | Tracked in |
|-----------------------------|--------------------------------------|------------|
| INV-002@Home@desktop        | brand font renders at 44px by design | ADR-004    |
| console:/ResizeObserver loop/ | Chromium noise from the chart widget |            |
```

## Keeping it small

- One row per rule that has broken before or that a design decision fixed. A contract with
  sixty rows is read by nobody and measured slowly.
- Prefer `css`, `count` and `rect` shorthands to raw expressions; they survive refactors better.
- Prune `Pending` when its `Until` passes; the `listed as pending` note on a `PASS` row is the
  reminder.
- Keep `Setup` to actions a tester would do in under ten seconds. Longer flows belong in Playwright.
