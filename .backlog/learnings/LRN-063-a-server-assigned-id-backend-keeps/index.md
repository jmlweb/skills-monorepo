---
id: LRN-063
title: A server-assigned ID backend keeps the ID out of the stored payload and derives it on read
status: active
tags: [flowstate, store, github, design]
task: TSK-081
created: 2026-11-07
---

## Context
`CreateInput.frontmatter(id)` needs the ID, but in `GithubStore` the ID is the issue number, known only after `gh issue create`.

## Insight
Labels and the metadata block never depend on the ID (it is excluded from the block), so a provisional `frontmatter(formatId(type, 0))` builds everything for one create call and the real frontmatter is rebuilt after. No second call, no counter.

## Application
Any backend whose ID is server-assigned: keep the ID out of the stored payload and derive it on read. Same for header-plus-body encodings: always emit `block\n` + body so the body's leading newline survives a round trip (`metadata-block.test.ts`).
