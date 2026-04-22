# Claude Code Plugin Documentation Reference

Source: https://code.claude.com/docs/en/plugins

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
| `agents`       | string\|array         | `agents/`                    |
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
| `description`              | Recommended | What + when. Truncated at 250 chars in listing. Front-load key use case. |
| `argument-hint`            | No          | Shown in autocomplete. E.g. `[issue-number]`                            |
| `disable-model-invocation` | No          | `true` = only user can invoke. Default: `false`                          |
| `user-invocable`           | No          | `false` = hidden from `/` menu. Default: `true`                          |
| `allowed-tools`            | No          | Space-separated or YAML list of tools Claude can use without permission  |
| `model`                    | No          | Model override when skill is active                                      |
| `effort`                   | No          | `low`, `medium`, `high`, `max` (Opus only)                              |
| `context`                  | No          | `fork` = run in subagent                                                 |
| `agent`                    | No          | Subagent type when `context: fork`. E.g. `Explore`, `Plan`              |
| `hooks`                    | No          | Hooks scoped to skill lifecycle                                          |
| `paths`                    | No          | Glob patterns limiting when skill activates                              |
| `shell`                    | No          | `bash` (default) or `powershell`                                         |

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
- Preprocessing, not Claude execution

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
- Front-load description with key use case (truncated at 250 chars)
- Keep SKILL.md under 500 lines; move details to supporting files
- Use `disable-model-invocation: true` for side-effect skills (deploy, commit)
- Use `user-invocable: false` for background knowledge skills
- Use `allowed-tools` to restrict tool access per skill
- Use `context: fork` for isolated tasks that don't need conversation history

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
