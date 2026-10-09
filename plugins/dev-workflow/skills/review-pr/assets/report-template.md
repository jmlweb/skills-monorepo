# PR Review Report Template

Use this template to aggregate all agent outputs into the final review. Findings are numbered globally (`#1`, `#2`, …) across agents and both axes. Standards and Spec are separate sections, each ranked on its own, never merged; the chat view hides Nice to Have and Info unless `--all`, but this file always keeps them all.

```markdown
# PR Review: #{number} - {title}

**Author**: @{author}
**Branch**: `{headRefName}` → `{baseRefName}`
**Status**: {state} | **Mergeable**: {mergeable}
**Size**: {complexity} ({files} files, +{additions}/-{deletions} lines)

---

## Summary
{One paragraph overview}

## Risk Assessment
**Overall Risk**: 🟢 Low | 🟡 Medium | 🔴 High

| Area | Risk | Reasoning |
|------|------|-----------|
| Security | {icon} | {summary} |
| Quality | {icon} | {summary} |
| Tests | {icon} | {summary} |
| Perf | {icon} | {summary} |

## Standards
**Summary**: {worst Standards finding, or "no findings"}

### Code Review
{code-reviewer findings, each `#N path:line: severity: finding`}

### Security Review
{security-reviewer output if applicable}

### Test Coverage
{qa-engineer output if applicable}

### Architecture
{architect outputs if applicable}

## Spec
**Source**: {task/report ID and where found | PR body | linked issue | no spec available}
**Summary**: {worst Spec finding, or "no findings" / "no spec available"}

{spec findings, each `#N path:line: severity: "criterion" — finding`}

## CI Checks
| Check | Status |
|-------|--------|

## Recommendations
Per axis (Standards, then Spec), list findings by severity:

### 🔴 Critical (blocks merge)
{#N path:line: finding}
### 🟠 Must Fix (blocks merge)
### 🟡 Should Fix (before merge recommended)
### 🟢 Nice to Have (follow-up)
### ℹ️ Info (no action needed)

## Decision
- [ ] ✅ **Approve**
- [ ] 🔄 **Request Changes**
- [ ] 💬 **Comment**
```
