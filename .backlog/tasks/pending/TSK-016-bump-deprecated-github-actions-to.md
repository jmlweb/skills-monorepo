---
id: TSK-016
title: Bump deprecated GitHub Actions to current majors
status: pending
priority: P3
tags: [ci, maintenance]
created: 2026-07-07
source: manual
depends-on: []
---

# Bump deprecated GitHub Actions to current majors

## Description

GitHub annotates every workflow run with a Node 20 deprecation warning: actions/checkout@v4, actions/setup-node@v4, and pnpm/action-setup@v4 target Node 20 runners, which GitHub is deprecating (forced onto Node 24 since 2025-09). Seen on release.yml run 28900112861 (dev-workflow v1.1.1, 2026-07-07).

Upgrade the three actions to their current majors in both .github/workflows/ci.yml and .github/workflows/release.yml. Non-blocking today, but avoids future breakage when GitHub removes the Node 20 fallback.


## Acceptance Criteria

- [ ] ci.yml and release.yml reference current major versions of actions/checkout, actions/setup-node, and pnpm/action-setup
- [ ] A fresh workflow run shows no Node 20 deprecation annotations
- [ ] Both workflows pass green after the bump

## Notes

## Learnings

## Progress Log

- [2026-07-07] Created