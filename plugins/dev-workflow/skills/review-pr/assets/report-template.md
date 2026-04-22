# PR Review Report Template

Use this template to aggregate all agent outputs into the final review.

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

## Code Review
{code-reviewer output}

## Security Review
{security-reviewer output if applicable}

## Test Coverage
{qa-engineer output if applicable}

## Architecture
{architect outputs if applicable}

## CI Checks
| Check | Status |
|-------|--------|

## Recommendations

### 🔴 Critical (blocks merge)
### 🟠 Must Fix (blocks merge)
### 🟡 Should Fix (before merge recommended)
### 🟢 Nice to Have (follow-up)
### ℹ️ Info (no action needed)

## Decision
- [ ] ✅ **Approve**
- [ ] 🔄 **Request Changes**
- [ ] 💬 **Comment**
```
