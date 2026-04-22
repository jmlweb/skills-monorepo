---
argument-hint: [path or scope]
description: Validate and update project documentation and agent instructions
model: sonnet
---

Audit and fix project documentation, ensuring it follows standards and agent instructions are optimal.

## Usage

- `/check-docs` - Full audit of all documentation
- `/check-docs README.md` - Check specific file
- `/check-docs packages/` - Check specific directory
- `/check-docs agents` - Focus on agent instructions only

## Workflow

### Phase 0: Validate Environment

Before proceeding, verify:
1. Is it a git repo? Check for `.git/` directory
2. Do standard paths exist? (CLAUDE.md, AGENTS.md)
3. Is markdownlint available?

If critical files don't exist, report clearly and continue with available files.

### Phase 1: Discover Documentation Standards

1. Read project documentation rules from: AGENTS.md, .claude/CLAUDE.md, CONTRIBUTING.md, docs/STYLE_GUIDE.md
2. Reference global `~/.claude/CLAUDE.md` for markdown formatting rules, comment policy, language requirements
3. Check for markdownlint configuration

### Phase 2: Inventory Documentation Files

1. Find all markdown files using `git ls-files '*.md'`
2. Categorize by priority: Agent Instructions (critical) > Project README (high) > Package READMEs (high) > Changelogs (medium) > Other (low)

### Phase 3: Validate Agent Instructions

For AGENTS.md:
- Structure: clear sections, proper formatting, no broken links
- Content freshness: tech stack matches package.json, paths exist, commands valid
- Optimization: concise, critical info at top, no redundancy

For `.claude/` files:
- Proper frontmatter, clear usage, valid commands
- Referenced paths exist, no hardcoded outdated values

### Phase 4: Validate General Documentation

1. Run markdownlint if available
2. Check format: code blocks have language, H1 first line, no duplicate headings, proper tables
3. Check content: links work, examples match API, instructions valid, versions current

### Phase 5: Generate Report and Fix

Compile findings into Critical, High, Medium priority categories.

Auto-fix without confirmation:
- Missing language in code blocks
- Trailing whitespace
- Heading structure
- Obvious version mismatches

Confirm before fixing:
- Content changes
- Removing documentation
- Adding sections

Report only (manual fix):
- Broken external links
- Major restructuring

## Agent Instruction Best Practices

Structure: Project name, quick start, tech stack, key conventions, file structure.

Guidelines:
- Be specific and actionable, not vague
- Put critical info first
- Use examples, don't over-explain
- Keep under 500 lines
- Update when code changes

Freshness: Compare package.json deps with tech stack, actual files with documented structure, current commands with scripts section.

## Dry-Run Mode

Use `--dry-run` to preview changes without modifying files.

## Notes

- Preserve user's intentional formatting
- Don't add documentation where none existed (unless agent instructions)
- Respect .markdownlintignore
- For monorepos, check each package independently
- When in doubt, report rather than auto-fix
