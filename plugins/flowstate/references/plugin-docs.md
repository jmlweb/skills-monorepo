# Claude Code Plugin Documentation Reference

Sources: https://code.claude.com/docs/en/plugins, https://code.claude.com/docs/en/skills,
https://code.claude.com/docs/en/sub-agents (checked 2026-10-14)

---

## Plugin Manifest Schema (`.claude-plugin/plugin.json`)

### Required Fields

| Field  | Type   | Description                               |
|--------|--------|-------------------------------------------|
| `name` | string | Unique identifier (kebab-case, no spaces) |

### Metadata Fields

| Field         | Type   | Description                  |
|---------------|--------|------------------------------|
| `version`     | string | Semantic version (MAJOR.MINOR.PATCH) |
| `description` | string | Brief plugin purpose         |
| `author`      | object | `{name, email?, url?}`      |
| `homepage`    | string | Documentation URL            |
| `repository`  | string | Source code URL              |
| `license`     | string | License identifier           |
| `keywords`    | array  | Discovery tags               |

### Component Path Fields

| Field          | Type                  | Default Location             |
|----------------|-----------------------|------------------------------|
| `commands`     | string\|array         | `commands/`                  |
| `agents`       | string\|array (`.md` file paths only; omit to auto-discover) | `agents/` |
| `skills`       | string\|array         | `skills/`                    |
| `hooks`        | string\|array\|object | `hooks/hooks.json`           |
| `mcpServers`   | string\|array\|object | `.mcp.json`                  |
| `outputStyles` | string\|array         | `output-styles/`             |
| `lspServers`   | string\|array\|object | `.lsp.json`                  |
| `userConfig`   | object                | User-configurable values     |
| `channels`     | array                 | Channel declarations         |

Custom paths **replace** the default directory (except hooks/MCP/LSP which merge).

### Environment Variables

- `${CLAUDE_PLUGIN_ROOT}` - Absolute path to plugin installation dir (changes on update)
- `${CLAUDE_PLUGIN_DATA}` - Persistent dir for plugin state (survives updates)

Both are substituted in skill content, agent content, hook commands, and MCP/LSP configs.

---

## Skill Frontmatter Reference (`skills/*/SKILL.md`)

| Field                      | Required    | Description                                                              |
|----------------------------|-------------|--------------------------------------------------------------------------|
| `name`                     | No          | Display name. Defaults to directory name. Lowercase, numbers, hyphens. Max 64 chars. |
| `description`              | Recommended | What + when, third person. Front-load the key use case. Max 1024 chars (platform spec); the `/` listing shows `description` + `when_to_use` up to 1536 chars |
| `when_to_use`              | No          | Extra trigger phrases or example requests; appended to `description` in the listing |
| `argument-hint`            | No          | Shown in autocomplete. E.g. `[issue-number]`                            |
| `arguments`                | No          | Named positional args (`[issue, branch]`) available as `$issue`, `$branch` |
| `disable-model-invocation` | No          | `true` = only user can invoke; also blocks subagent preloading. Default: `false` |
| `user-invocable`           | No          | `false` = hidden from `/` menu. Default: `true`                          |
| `allowed-tools`            | No          | Tools pre-approved for the turn that invokes the skill (space-, comma-separated or YAML list). Grants only; clears on the next user message |
| `disallowed-tools`         | No          | Tools removed while the skill is active; clears on the next user message |
| `model`                    | No          | Same values as `/model` (`haiku`, `sonnet`, `opus`, a full model ID) or `inherit`. Turn-only; sets the subagent model with `context: fork` |
| `effort`                   | No          | `low`, `medium`, `high`, `xhigh`, `max`; available levels depend on the model |
| `context`                  | No          | `fork` = run in a forked subagent with the skill text and `$ARGUMENTS` as its prompt, no conversation history |
| `agent`                    | No          | Subagent type when `context: fork`: `Explore`, `Plan`, `general-purpose` (default) or `<plugin>:<agent>` |
| `background`               | No          | With `context: fork`: `true` (default) returns immediately, `false` waits for the report. Needs Claude Code 2.1.218+ |
| `hooks`                    | No          | Hooks active from invocation until session end                           |
| `paths`                    | No          | Glob patterns limiting when skill activates                              |
| `shell`                    | No          | `bash` (default) or `powershell` for `` !`cmd` `` blocks                 |
| `metadata`, `license`, `compatibility` | No | Accepted and ignored by Claude Code; the only extra keys allowed when the same SKILL.md is uploaded to claude.ai or the Skills API |

Unknown keys are ignored without an error in Claude Code (the root flowstate `SKILL.md` relies on this for `version`). Booleans accept `true/false`, `yes/no`, `on/off`, `1/0`.

### String Substitutions

| Variable               | Description                                    |
|------------------------|------------------------------------------------|
| `$ARGUMENTS`           | All args passed when invoking                  |
| `$ARGUMENTS[N]` / `$N` | Specific arg by 0-based index                 |
| `${CLAUDE_SESSION_ID}` | Current session ID                             |
| `${CLAUDE_SKILL_DIR}`  | Directory containing the SKILL.md              |
| `${CLAUDE_PLUGIN_ROOT}`| Plugin installation directory                  |

### Invocation Control Matrix

| Frontmatter                      | User invoke | Claude invoke | Description in context |
|----------------------------------|-------------|---------------|------------------------|
| (default)                        | Yes         | Yes           | Yes                    |
| `disable-model-invocation: true` | Yes         | No            | No                     |
| `user-invocable: false`          | No          | Yes           | Yes                    |

### Dynamic Context Injection

- `` !`command` `` inline: runs shell command, output replaces placeholder
- ` ```! ` fenced block: multi-line shell commands
- Preprocessing, not Claude execution. A failing command aborts the whole invocation, so a
  command that may legitimately fail (e.g. `flowstate path` without a backlog) stays a
  model-run step instead

### Permission rules

`allowed-tools` entries use the settings permission syntax: `Bash(node:*)` matches any
command string that starts with `node `. A pipeline that starts with `cat` is not matched,
so stdin bodies go in a heredoc attached to the `node` command (`node … --body - <<'BODY'`).
Skills are matched with `Skill(name)` (exact) or `Skill(name *)` (prefix).

---

## Hooks Reference (`hooks/hooks.json`)

### Event Types

| Event                | When it fires                                          |
|----------------------|--------------------------------------------------------|
| `SessionStart`       | Session begins or resumes                              |
| `UserPromptSubmit`   | Prompt submitted, before processing                    |
| `PreToolUse`         | Before tool call (can block)                           |
| `PermissionRequest`  | Permission dialog appears                              |
| `PermissionDenied`   | Tool call denied by classifier                         |
| `PostToolUse`        | After tool call succeeds                               |
| `PostToolUseFailure` | After tool call fails                                  |
| `Notification`       | Claude sends notification                              |
| `SubagentStart`      | Subagent spawned                                       |
| `SubagentStop`       | Subagent finishes                                      |
| `TaskCreated`        | Task created via TaskCreate                            |
| `TaskCompleted`      | Task marked completed                                  |
| `Stop`               | Claude finishes responding                             |
| `StopFailure`        | Turn ends due to API error                             |
| `TeammateIdle`       | Agent team teammate going idle                         |
| `InstructionsLoaded` | CLAUDE.md or rules file loaded                         |
| `ConfigChange`       | Config file changes during session                     |
| `CwdChanged`         | Working directory changes                              |
| `FileChanged`        | Watched file changes (matcher = filenames to watch)    |
| `WorktreeCreate`     | Worktree being created                                 |
| `WorktreeRemove`     | Worktree being removed                                 |
| `PreCompact`         | Before context compaction                              |
| `PostCompact`        | After compaction completes                             |
| `Elicitation`        | MCP server requests user input                         |
| `ElicitationResult`  | User responds to MCP elicitation                       |
| `SessionEnd`         | Session terminates                                     |

### Hook Types

- `command` - Execute shell commands/scripts
- `http` - POST event JSON to a URL
- `prompt` - Evaluate prompt with LLM (uses `$ARGUMENTS`)
- `agent` - Run agentic verifier with tools

### Hook Format

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/my-script.sh"
          }
        ]
      }
    ]
  }
}
```

---

## Agent Frontmatter (`agents/*.md`)

| Field             | Description                                    |
|-------------------|------------------------------------------------|
| `name`            | Agent identifier                               |
| `description`     | When Claude should invoke it                   |
| `model`           | Model to use                                   |
| `effort`          | Effort level                                   |
| `maxTurns`        | Maximum turns                                  |
| `tools`           | Allowed tools                                  |
| `disallowedTools` | Denied tools                                   |
| `skills`          | Preloaded skills                               |
| `memory`          | Memory access                                  |
| `background`      | Run in background                              |
| `isolation`       | `"worktree"` for isolated copy                 |

Not supported in plugins: `hooks`, `mcpServers`, `permissionMode`.

---

## Directory Structure

```
plugin-root/
├── .claude-plugin/           # ONLY plugin.json goes here
│   └── plugin.json
├── skills/                   # Skills (SKILL.md in subdirs)
├── commands/                 # Legacy commands (.md files)
├── agents/                   # Subagent definitions
├── hooks/                    # hooks.json + scripts
├── bin/                      # Executables added to PATH
├── output-styles/            # Output style definitions
├── settings.json             # Default settings (only `agent` key supported)
├── .mcp.json                 # MCP server configs
├── .lsp.json                 # LSP server configs
├── README.md
└── LICENSE
```

**Critical**: Don't put skills/, commands/, agents/, hooks/ inside `.claude-plugin/`.

---

## Best Practices

### Skills
- Front-load description with key use case; include the words users would naturally say
- Keep SKILL.md under 500 lines (official cap; this repo caps bodies at 150 and discloses
  the rest into `references/` or `shared/`)
- Use `disable-model-invocation: true` for side-effect skills (deploy, commit)
- Use `user-invocable: false` for background knowledge skills
- Use `allowed-tools` to pre-approve the minimal scoped set per skill
- Use `context: fork` only for skills with explicit instructions, no user questions and no
  dependence on the conversation
- Test with every model tier the skill may run on; what works on Opus may need more detail
  for Haiku. `claude plugin eval` runs with/without baselines; `/skill-doctor` reports
  listing cost and unused skills

### Plugin
- Use `${CLAUDE_PLUGIN_ROOT}` for all paths to bundled files
- Use `${CLAUDE_PLUGIN_DATA}` for persistent state
- All paths relative, starting with `./`
- Bump version in plugin.json for every change (caching)
- Pre-build dist/ so users don't need build tools
- Make hook scripts executable (`chmod +x`)

### Debugging
- `claude --debug` for loading details
- `claude plugin validate` / `/plugin validate` for schema validation
- Check scripts are executable and have proper shebangs
- Event names are case-sensitive (e.g. `PostToolUse`, not `postToolUse`)

---

## CLI Commands

```bash
claude plugin install <plugin> [--scope user|project|local]
claude plugin uninstall <plugin> [--scope] [--keep-data]
claude plugin enable <plugin> [--scope]
claude plugin disable <plugin> [--scope]
claude plugin update <plugin> [--scope]
```

---

## Distribution

- Submit to official marketplace: claude.ai/settings/plugins/submit or platform.claude.com/plugins/submit
- Use semantic versioning (start at 1.0.0)
- Document changes in CHANGELOG.md
- Pre-release versions: `2.0.0-beta.1`
