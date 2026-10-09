#!/usr/bin/env node
// Lints every SKILL.md against the AGENTS.md "New or edited skill" quality bar.
// Zero dependencies on purpose: the repo ships no runtime deps and the frontmatter
// subset the skills use (flat `key: value`) does not justify a YAML parser.
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ALLOWED_KEYS = new Set([
  'name',
  'description',
  'argument-hint',
  'allowed-tools',
  'model',
  'effort',
  'disable-model-invocation',
])
const ROOT_SKILL_EXTRA_KEYS = new Set(['version'])
const MAX_DESCRIPTION_CHARS = 1024
const MIN_TRIGGER_PHRASES = 3
const MAX_BODY_LINES = 150

// Structural rules fail the build today; the rest start as warnings so legacy skills
// can be cleaned up gradually (--strict promotes every warning).
const SEVERITY = {
  'skill-missing': 'error',
  'frontmatter-unreadable': 'error',
  'name-matches-dir': 'error',
  'frontmatter-keys': 'error',
  'description-length': 'error',
  'description-single-line': 'error',
  'description-triggers': 'warn',
  'body-length': 'warn',
  'model-tier': 'error',
  'plugin-root-path': 'warn',
  'cli-contract': 'error',
  'readme-drift': 'error',
}

// Exemptions live here, never in skill frontmatter. Key: repo-relative path, value: rule ids.
const EXEMPTIONS = {
  // Always-on context skill: activated by project state, not by user phrases.
  'plugins/flowstate/SKILL.md': ['description-triggers'],
}

/** Reads a flat `key: value` frontmatter block; returns null when it is missing or unterminated. */
export function parseFrontmatter(text) {
  const lines = text.split('\n')
  if (lines[0]?.trim() !== '---') return null
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---')
  if (end === -1) return null
  const fields = {}
  const multiline = new Set()
  let current = null
  for (const line of lines.slice(1, end)) {
    const match = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line)
    if (match) {
      current = match[1]
      fields[current] = match[2].trim()
      if (/^[>|][+-]?$/.test(fields[current])) multiline.add(current)
    } else if (current && line.trim() !== '') {
      multiline.add(current)
    }
  }
  return { fields, multiline, body: lines.slice(end + 1) }
}

/** Command names listed under "Commands:" in a binary's --help output. */
export function parseHelpCommands(helpText) {
  const lines = helpText.split('\n')
  const start = lines.findIndex((line) => line.trim() === 'Commands:')
  if (start === -1) return []
  const commands = []
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '') break
    // Exactly two leading spaces: wrapped description lines are indented deeper.
    const match = /^ {2}([a-z][\w-]*)\s+/.exec(line)
    if (match) commands.push(match[1])
  }
  return commands
}

function listDirs(path) {
  if (!existsSync(path)) return []
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

function collectSkills(root) {
  const targets = []
  const missing = []
  for (const plugin of listDirs(join(root, 'plugins'))) {
    const pluginDir = join(root, 'plugins', plugin)
    if (existsSync(join(pluginDir, 'SKILL.md'))) {
      targets.push({ plugin, dir: pluginDir, file: join(pluginDir, 'SKILL.md'), kind: 'root' })
    }
    for (const name of listDirs(join(pluginDir, 'skills'))) {
      const file = join(pluginDir, 'skills', name, 'SKILL.md')
      if (existsSync(file)) targets.push({ plugin, dir: pluginDir, file, kind: 'plugin' })
      else missing.push(file)
    }
  }
  for (const name of listDirs(join(root, '.claude', 'skills'))) {
    const file = join(root, '.claude', 'skills', name, 'SKILL.md')
    if (existsSync(file)) targets.push({ plugin: null, dir: null, file, kind: 'local' })
    else missing.push(file)
  }
  return { targets, missing }
}

function createHelpCache() {
  const cache = new Map()
  return (binPath) => {
    if (cache.has(binPath)) return cache.get(binPath)
    // dev-workflow and atlassian-polish print --help on stderr, flowstate on stdout.
    const run = spawnSync(process.execPath, [binPath, '--help'], { encoding: 'utf8' })
    const commands = parseHelpCommands(`${run.stdout}\n${run.stderr}`)
    const result =
      run.error || commands.length === 0
        ? { error: run.error?.message ?? 'no "Commands:" section in --help output' }
        : { commands }
    cache.set(binPath, result)
    return result
  }
}

function lintSkill(root, target, getHelp) {
  const rel = relative(root, target.file)
  const findings = []
  const add = (rule, message) => findings.push({ file: rel, rule, message, severity: SEVERITY[rule] })

  const parsed = parseFrontmatter(readFileSync(target.file, 'utf8'))
  if (!parsed) {
    add('frontmatter-unreadable', 'missing or unterminated `---` frontmatter block')
    return findings
  }
  const { fields, multiline, body } = parsed

  if (target.kind !== 'root' && fields.name !== basename(dirname(target.file))) {
    add('name-matches-dir', `name "${fields.name ?? ''}" does not match directory "${basename(dirname(target.file))}"`)
  }

  const allowed = target.kind === 'root' ? new Set([...ALLOWED_KEYS, ...ROOT_SKILL_EXTRA_KEYS]) : ALLOWED_KEYS
  for (const key of Object.keys(fields).filter((k) => !allowed.has(k))) {
    add('frontmatter-keys', `frontmatter key "${key}" is not in the allowlist`)
  }

  const description = fields.description ?? ''
  const exemptFromTriggers = fields['disable-model-invocation'] === 'true'
  if (description.length > MAX_DESCRIPTION_CHARS) {
    add('description-length', `description is ${description.length} chars (max ${MAX_DESCRIPTION_CHARS})`)
  }
  if (multiline.has('description')) {
    add('description-single-line', 'description must be a single-line scalar')
  }
  const triggerCount = (description.match(/"[^"]+"/g) ?? []).length
  if (!exemptFromTriggers && triggerCount < MIN_TRIGGER_PHRASES) {
    add('description-triggers', `description has ${triggerCount} quoted trigger phrases (min ${MIN_TRIGGER_PHRASES})`)
  }

  const bodyLines = body.join('\n').replace(/\s+$/, '').split('\n').length
  if (bodyLines > MAX_BODY_LINES) {
    add('body-length', `body is ${bodyLines} lines (max ${MAX_BODY_LINES})`)
  }

  if (fields.model === 'haiku' && 'effort' in fields) {
    add('model-tier', 'haiku skills must not set `effort`')
  }
  if (fields.model === 'sonnet' && !['medium', 'high'].includes(fields.effort ?? '')) {
    add('model-tier', 'sonnet skills require `effort: medium` or `effort: high`')
  }

  const bodyText = body.join('\n')
  if (target.kind !== 'local') {
    const seen = new Set()
    for (const match of bodyText.matchAll(/(?<![\w./-])((?:shared|references)\/[\w./-]+\.md)/g)) {
      // The lookbehind skips mentions already written as ${CLAUDE_PLUGIN_ROOT}/<dir>/..., where "/" precedes the dir.
      const path = match[1]
      const dirName = path.split('/')[0]
      if (seen.has(path)) continue
      seen.add(path)
      // A skill that spells out the prefix for that directory once may refer to files bare afterwards.
      if (bodyText.includes(`\${CLAUDE_PLUGIN_ROOT}/${dirName}/`)) continue
      add('plugin-root-path', `"${path}" must be written as \${CLAUDE_PLUGIN_ROOT}/${path}`)
    }
  }

  if (target.plugin) {
    const seen = new Set()
    for (const match of bodyText.matchAll(/([\w-]+)\.js"\s+([a-z][\w-]*)/g)) {
      const [, bin, command] = match
      if (seen.has(`${bin} ${command}`)) continue
      seen.add(`${bin} ${command}`)
      const binPath = join(target.dir, 'dist', 'bin', `${bin}.js`)
      if (!existsSync(binPath)) {
        add('cli-contract', `${bin}.js is not built at ${relative(root, binPath)}`)
        continue
      }
      const help = getHelp(binPath)
      if (help.error) add('cli-contract', `could not run ${bin}.js --help: ${help.error.split('\n')[0]}`)
      else if (!help.commands.includes(command)) add('cli-contract', `${bin}.js has no subcommand "${command}"`)
    }
  }

  return findings
}

/** Mentions count only in headings and the first cell of table rows; other cells may cite foreign commands (e.g. `/clear`). */
function lintReadme(root, plugin, skillNames) {
  const rel = `plugins/${plugin}/README.md`
  const readmePath = join(root, rel)
  const findings = []
  const add = (message) => findings.push({ file: rel, rule: 'readme-drift', message, severity: SEVERITY['readme-drift'] })
  if (!existsSync(readmePath)) {
    if (skillNames.length > 0) add('plugin README is missing')
    return findings
  }
  const mentioned = new Set()
  const unknown = new Set()
  const mentionZones = readFileSync(readmePath, 'utf8')
    .split('\n')
    .filter((l) => /^(\||#)/.test(l))
    .map((l) => (l.startsWith('|') ? (l.split('|')[1] ?? '') : l))
  for (const line of mentionZones) {
    for (const match of line.matchAll(/`\/(?:([a-z][\w-]*):)?([a-z][\w-]*)/g)) {
      const [, prefix, name] = match
      if (prefix && prefix !== plugin) continue
      if (skillNames.includes(name)) mentioned.add(name)
      else unknown.add(prefix ? `/${prefix}:${name}` : `/${name}`)
    }
  }
  for (const name of skillNames.filter((n) => !mentioned.has(n))) {
    add(`skill "${name}" is not mentioned in a heading or table row`)
  }
  for (const ref of unknown) add(`README mentions ${ref}, which is not a skill of this plugin`)
  return findings
}

/** Lints a repo checkout; returns findings with exempted rules removed and severities applied. */
export function lintRepo(root, { strict = false } = {}) {
  const { targets, missing } = collectSkills(root)
  const getHelp = createHelpCache()
  const findings = missing.map((file) => ({
    file: relative(root, file),
    rule: 'skill-missing',
    message: 'skill directory has no SKILL.md',
    severity: SEVERITY['skill-missing'],
  }))
  findings.push(...targets.flatMap((target) => lintSkill(root, target, getHelp)))

  const pluginSkills = new Map()
  for (const target of targets.filter((t) => t.kind === 'plugin')) {
    pluginSkills.set(target.plugin, [...(pluginSkills.get(target.plugin) ?? []), basename(dirname(target.file))])
  }
  for (const [plugin, names] of pluginSkills) findings.push(...lintReadme(root, plugin, names))

  return findings
    .filter((f) => !(EXEMPTIONS[f.file] ?? []).includes(f.rule))
    .map((f) => (strict && f.severity === 'warn' ? { ...f, severity: 'error' } : f))
}

function main() {
  const strict = process.argv.includes('--strict')
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const findings = lintRepo(root, { strict })
  for (const f of findings) console.log(`${f.severity.toUpperCase().padEnd(5)} ${f.file} [${f.rule}] ${f.message}`)
  const errors = findings.filter((f) => f.severity === 'error').length
  console.log(`\n${errors} error(s), ${findings.length - errors} warning(s)${strict ? ' (strict)' : ''}`)
  process.exit(errors > 0 ? 1 : 0)
}

if (process.argv[1] && statSync(process.argv[1]).isFile() && fileURLToPath(import.meta.url) === process.argv[1]) main()
