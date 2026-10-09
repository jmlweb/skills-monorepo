# Caveman compression rules

Used by `condense-tasks` and `condense-learnings` when rewriting a body terse. The CLI
validator rejects any rewrite that breaks the byte-exact list below.

## Drop

- Articles: `a`, `an`, `the`
- Filler: `just`, `really`, `basically`, `actually`, `simply`, `essentially`, `generally`
- Pleasantries: `sure`, `certainly`, `of course`, `happy to`, `I'd recommend`
- Hedging: `it might be worth`, `you could consider`, `it would be good to`
- Connective fluff: `however`, `furthermore`, `additionally`, `in addition`
- Redundant phrasing: `in order to` → `to`, `make sure to` → `ensure`, `the reason is because` → `because`
- "you should", "remember to", "we need to": state the action directly

## Preserve exactly (validator enforces, byte-exact)

- Fenced code blocks (```` ``` ````), every byte including blank lines and comments inside
- Inline code (`` `…` ``)
- URLs (`https://…`)
- IDs: `TSK-\d{3,}`, `LRN-\d{3,}`, `PLN-\d{3,}`, `RPT-\d{3,}`
- Dates: `YYYY-MM-DD`
- Version numbers: `vX.Y.Z`
- All markdown headings (same set, same order, exact heading text)
- Tasks only: the entire `## Acceptance Criteria` section

## Compress

- Short synonyms: `big` not `extensive`, `fix` not `implement a solution for`, `use` not `utilize`
- Fragments are fine: `Run tests before push.` not `You should always make sure to run the tests before pushing.`
- Merge bullets that say the same thing differently
- Keep one example where several show the same pattern
- Learnings with `**Why:**` / `**How to apply:**` blocks: keep the labels, compress the prose after them

## Pattern

> Original: "We were finally able to track down the root cause of the bug, which turned out to be in the auth middleware where the token expiry check was using `<` instead of `<=`."
>
> Compressed: "Root cause: auth middleware token expiry check used `<` instead of `<=`."
