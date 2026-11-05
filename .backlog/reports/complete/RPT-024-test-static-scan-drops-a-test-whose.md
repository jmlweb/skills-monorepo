---
id: RPT-024
title: test-static-scan drops a test whose body holds a quote inside a regex literal
type: bug
severity: medium
status: triaged
created: 2026-11-05
triaged: 2026-11-05
task-id: TSK-072
---

## Location

`plugins/dev-workflow/src/core/test-blocks.ts:41` (`findClosing` treats every `'`, `"` and backtick as a string opener) and `:55` (`skipString`). Regex literals are not recognised, so a quote inside `/.../` starts a fake string that runs to the next matching quote in the file.

## Reproduction

`a.test.ts`:

```ts
import { test, expect } from "vitest";

test("quote regex", () => {
  expect("x").toMatch(/don't/);
});

test("second", () => {
  expect(1).toBe(1);
});
```

Run `node plugins/dev-workflow/dist/bin/dev-workflow.js test-static-scan --json true` in that directory.

## Observed

`"tests": 1` — only `second` is reported. `quote regex` is missing: `findClosing` never finds the closing paren of its call, so `extractTestBlocks` (`test-blocks.ts:97`) skips it with `continue`.

## Expected

`"tests": 2`. Every test call is listed, so `/prune-tests` does not miss assertion-free, duplicate or skipped tests that happen to use a regex with a quote (common in `toMatch(/can't/)`, `toThrow(/"x"/)`).

## Impact

Silent undercount in `test-static-scan`; tests disappear from the prune-tests audit with no warning.
