Output docs/media/add-task.gif

Set Shell "bash"
Set FontSize 16
Set Width 1000
Set Height 1000
Set Padding 20
Set TypingSpeed 40ms
Set Theme "Catppuccin Mocha"
Set PlaybackSpeed 3.0

Hide
Type `unset CLAUDECODE CLAUDE_CODE_CHILD_SESSION CLAUDE_CODE_ENTRYPOINT; export FLOWSTATE_SHARED=off`
Enter
Type `P="$(mktemp -d)/flowstate" && cp -R "$PWD" "$P" && cd "$(mktemp -d)" && git init -q`
Enter
Type `fs() { node "$P/dist/bin/flowstate.js" "$@"; }`
Enter
Type `fs setup >/dev/null`
Enter
Type `clear && claude --plugin-dir "$P" --strict-mcp-config --permission-mode default --allowedTools 'Bash(node:*)' 'Read' 'Glob' 'Grep' --settings '{"statusLine":{"type":"command","command":"true"}}'`
Enter
Wait+Screen@30s /Yes, I trust this folder/
Sleep 500ms
Down
Enter
Wait+Screen@30s /Claude Code v/
Sleep 2s
Show

Type "/flowstate:add-task Fix pagination off-by-one"
Sleep 300ms
Enter
Wait+Screen@180s / for (\d+m )?\d+s · done \d/
Sleep 2s
Type "yes"
Enter
Wait+Screen@180s /TSK-001-fix/
Sleep 5s
