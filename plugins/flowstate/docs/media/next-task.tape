Output docs/media/next-task.gif

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
Type `fs task-create --title "Add user authentication" --priority P2 --tags backend,auth --criteria '["Login returns a JWT","Protected routes reject anonymous calls"]' >/dev/null; fs task-create --title "Fix pagination off-by-one" --priority P1 --tags api --criteria '["Last page returns its items"]' >/dev/null; fs task-create --title "Set up CI" --priority P3 --tags infra --criteria '["Tests run on every push"]' >/dev/null; fs task-move TSK-003 --to active >/dev/null`
Enter
Type `clear`
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

Type "/flowstate:next-task"
Sleep 300ms
Enter
Wait+Screen@180s / for (\d+m )?\d+s · done \d/
Sleep 5s
