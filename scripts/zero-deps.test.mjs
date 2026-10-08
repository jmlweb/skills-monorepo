import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkZeroDeps } from './check-zero-deps.mjs'

async function withPlugins(packages, fn) {
  const dir = await mkdtemp(join(tmpdir(), 'zero-deps-'))
  try {
    for (const [name, pkg] of Object.entries(packages)) {
      await mkdir(join(dir, name))
      if (pkg !== null) await writeFile(join(dir, name, 'package.json'), JSON.stringify(pkg))
    }
    await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

const clean = { devDependencies: { '@types/node': '^22', typescript: '^5', vitest: '^3' } }

test('passes on allowed devDependencies only', async () => {
  await withPlugins({ good: clean }, async (dir) => {
    assert.deepEqual(checkZeroDeps(dir), [])
  })
})

test('fails on a dependencies key, naming plugin and key', async () => {
  await withPlugins({ bad: { ...clean, dependencies: { yaml: '^2' } } }, async (dir) => {
    const [msg, ...rest] = checkZeroDeps(dir)
    assert.equal(rest.length, 0)
    assert.match(msg, /bad/)
    assert.match(msg, /dependencies/)
  })
})

test('fails on a devDependency outside the allowlist, naming plugin and package', async () => {
  await withPlugins({ bad: { devDependencies: { ...clean.devDependencies, lodash: '^4' } } }, async (dir) => {
    const [msg, ...rest] = checkZeroDeps(dir)
    assert.equal(rest.length, 0)
    assert.match(msg, /bad/)
    assert.match(msg, /lodash/)
  })
})

test('throws when a plugin has no package.json', async () => {
  await withPlugins({ broken: null }, async (dir) => {
    assert.throws(() => checkZeroDeps(dir), /broken/)
  })
})

test('throws when the plugins dir is missing', () => {
  assert.throws(() => checkZeroDeps(join(tmpdir(), 'does-not-exist-zero-deps')))
})

test('real repo plugins satisfy zero runtime dependencies', () => {
  const pluginsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'plugins')
  assert.deepEqual(checkZeroDeps(pluginsDir), [])
})
