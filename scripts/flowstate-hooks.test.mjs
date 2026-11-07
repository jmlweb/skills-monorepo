// Spawns the flowstate hook scripts with the stdin payloads Claude Code documents
// (https://code.claude.com/docs/en/hooks) and asserts the JSON they print.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { installStub } from './gh-stub.mjs'

const hooksDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'plugins', 'flowstate', 'hooks')

function runHook(name, payload, { cwd = tmpdir(), env = {} } = {}) {
  const result = spawnSync('bash', [join(hooksDir, name)], {
    cwd,
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env, FLOWSTATE_BACKLOG_DIR: env.FLOWSTATE_BACKLOG_DIR ?? '' },
  })
  assert.equal(result.status, 0, `${name} exited ${result.status}: ${result.stderr}`)
  return { stdout: result.stdout, json: result.stdout.trim() === '' ? null : JSON.parse(result.stdout) }
}

const failure = (command, error, extra = {}) => ({
  hook_event_name: 'PostToolUseFailure',
  tool_name: 'Bash',
  tool_input: { command, description: 'Run tests' },
  tool_use_id: 'toolu_01ABC123',
  error,
  is_interrupt: false,
  ...extra,
})

test('on-test-failure: nudges /flowstate:report when a test command exits non-zero', () => {
  const { json } = runHook('on-test-failure.sh', failure('npm test', "Exit code 1\nError: Cannot find module 'express'"))
  assert.deepEqual(json, {
    hookSpecificOutput: {
      hookEventName: 'PostToolUseFailure',
      additionalContext: "Tests failed. Consider running /flowstate:report to document this issue if it's unexpected.",
    },
  })
})

test('on-test-failure: matches every supported runner, case-insensitively', () => {
  for (const command of ['pnpm vitest run', 'JEST --ci', 'pytest -x', 'cargo test', 'go test ./...', 'pnpm test']) {
    const { json } = runHook('on-test-failure.sh', failure(command, 'Exit code 2\n1 failed'))
    assert.equal(json?.hookSpecificOutput?.hookEventName, 'PostToolUseFailure', command)
  }
})

test('on-test-failure: stays silent on a successful PostToolUse payload', () => {
  const { stdout } = runHook('on-test-failure.sh', {
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'pnpm test' },
    tool_response: { stdout: 'all green', stderr: '', interrupted: false },
  })
  assert.equal(stdout, '')
})

test('on-test-failure: stays silent when the failed command is not a test runner', () => {
  const { stdout } = runHook('on-test-failure.sh', failure('ls /missing', 'Exit code 1\nls: /missing: No such file'))
  assert.equal(stdout, '')
})

test('on-test-failure: stays silent on an interrupt or a bare error without an exit-code line', () => {
  assert.equal(runHook('on-test-failure.sh', failure('pnpm test', 'Exit code 1\naborted', { is_interrupt: true })).stdout, '')
  assert.equal(runHook('on-test-failure.sh', failure('pnpm test', 'spawn /bin/zsh ENOENT')).stdout, '')
})

test('on-test-failure: stays silent for tools other than Bash', () => {
  const { stdout } = runHook('on-test-failure.sh', failure('pnpm test', 'Exit code 1', { tool_name: 'Edit' }))
  assert.equal(stdout, '')
})

async function withBacklog(tasks, fn) {
  const dir = await mkdtemp(join(tmpdir(), 'flowstate-hooks-'))
  try {
    const active = join(dir, '.backlog', 'tasks', 'active')
    await mkdir(active, { recursive: true })
    for (const [id, title] of Object.entries(tasks)) {
      await writeFile(join(active, `${id}.md`), `---\nid: ${id}\ntitle: ${title}\nstatus: active\n---\n\n# ${title}\n`)
    }
    await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

const commit = (command) => ({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command }, tool_use_id: 'toolu_01ABC123' })

test('pre-commit-reminder: lists active tasks inside hookSpecificOutput before git commit', async () => {
  await withBacklog({ 'TSK-001': 'Ship the thing' }, async (dir) => {
    const { json } = runHook('pre-commit-reminder.sh', commit('git commit -m "wip"'), { cwd: dir })
    assert.deepEqual(json, {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext:
          'Before committing — active tasks in backlog:\n  - TSK-001: Ship the thing\nConsider if this commit completes any of them (/flowstate:complete-task).',
      },
    })
  })
})

test('pre-commit-reminder: prints valid JSON when a title holds a double quote and a backslash', async () => {
  await withBacklog({ 'TSK-002': 'Handle "draft" PRs on C:\\repo' }, async (dir) => {
    const { json } = runHook('pre-commit-reminder.sh', commit('git commit -am "fix"'), { cwd: dir })
    assert.match(json.hookSpecificOutput.additionalContext, /  - TSK-002: Handle "draft" PRs on C:\\repo\n/)
  })
})

// GitHub mode: the hook asks the CLI, which asks a stub gh on PATH (scripts/gh-stub.mjs).
async function withGithubBacklog(issues, fn, { auth = true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'flowstate-hooks-gh-'))
  try {
    await mkdir(join(dir, '.backlog', 'learnings'), { recursive: true })
    const bin = join(dir, 'bin')
    await mkdir(bin)
    installStub(bin)
    const statePath = join(dir, 'state.json')
    await writeFile(statePath, JSON.stringify({ repo: 'acme/widgets', auth, nextNumber: issues.length + 1, labels: ['flowstate:task', 'status:active'], issues }))
    await fn(dir, {
      PATH: `${bin}:${process.env.PATH}`,
      GH_STUB_STATE: statePath,
      FLOWSTATE_BACKEND: 'github',
      FLOWSTATE_GITHUB_REPO: 'acme/widgets',
      FLOWSTATE_SHARED: 'off',
    })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

const ghIssue = (number, title, labels) => ({ number, title, body: '```flowstate\ncreated: 2026-11-07\n```\n', labels, state: 'OPEN' })

test('pre-commit-reminder: in GitHub mode lists the active task issues through the CLI', async () => {
  const issues = [ghIssue(1, 'Pending one', ['flowstate:task']), ghIssue(2, 'Ship "it"', ['flowstate:task', 'status:active'])]
  await withGithubBacklog(issues, async (dir, env) => {
    const { json } = runHook('pre-commit-reminder.sh', commit('git commit -m "wip"'), { cwd: dir, env })
    assert.deepEqual(json, {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext:
          'Before committing — active tasks in backlog:\n  - TSK-002: Ship "it"\nConsider if this commit completes any of them (/flowstate:complete-task).',
      },
    })
  })
})

test('pre-commit-reminder: in GitHub mode stays silent when no task is active, when gh fails, and when gh is missing', async () => {
  await withGithubBacklog([ghIssue(1, 'Pending', ['flowstate:task'])], async (dir, env) => {
    assert.equal(runHook('pre-commit-reminder.sh', commit('git commit'), { cwd: dir, env }).stdout, '')
  })
  await withGithubBacklog([ghIssue(1, 'Active', ['flowstate:task', 'status:active'])], async (dir, env) => {
    assert.equal(runHook('pre-commit-reminder.sh', commit('git commit'), { cwd: dir, env }).stdout, '')
  }, { auth: false })
  await withGithubBacklog([ghIssue(1, 'Active', ['flowstate:task', 'status:active'])], async (dir, env) => {
    const noGh = await mkdtemp(join(tmpdir(), 'flowstate-hooks-nogh-'))
    try {
      assert.equal(runHook('pre-commit-reminder.sh', commit('git commit'), { cwd: dir, env: { ...env, PATH: `${noGh}:${dirname(process.execPath)}:/usr/bin:/bin` } }).stdout, '')
    } finally {
      await rm(noGh, { recursive: true, force: true })
    }
  })
})

test('pre-commit-reminder: stays silent for non-commit commands and when no task is active', async () => {
  await withBacklog({ 'TSK-003': 'Anything' }, async (dir) => {
    assert.equal(runHook('pre-commit-reminder.sh', commit('git status'), { cwd: dir }).stdout, '')
  })
  await withBacklog({}, async (dir) => {
    assert.equal(runHook('pre-commit-reminder.sh', commit('git commit'), { cwd: dir }).stdout, '')
  })
})
