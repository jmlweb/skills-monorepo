import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// The zero-dependency constraint is a product feature: Claude Code clones the
// repo and runs committed dist/ with no install step.
export const ALLOWED_DEV_DEPENDENCIES = ['@types/node', 'typescript', 'vitest']
const RUNTIME_KEYS = ['dependencies', 'peerDependencies', 'optionalDependencies', 'bundledDependencies']

export function checkZeroDeps(pluginsDir) {
  // readdirSync throws if the dir is missing: a lookup failure must not look like "no violations".
  const pluginNames = readdirSync(pluginsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  if (pluginNames.length === 0) {
    throw new Error(`No plugin directories found in ${pluginsDir}`)
  }

  return pluginNames.flatMap((plugin) => {
    const file = join(pluginsDir, plugin, 'package.json')
    let pkg
    try {
      pkg = JSON.parse(readFileSync(file, 'utf8'))
    } catch (error) {
      throw new Error(`Plugin "${plugin}": cannot read ${file}: ${error.message}`)
    }
    const runtime = RUNTIME_KEYS.filter((key) => key in pkg).map(
      (key) => `Plugin "${plugin}": forbidden "${key}" key in package.json (zero runtime dependencies)`,
    )
    const dev = Object.keys(pkg.devDependencies ?? {})
      .filter((name) => !ALLOWED_DEV_DEPENDENCIES.includes(name))
      .map(
        (name) =>
          `Plugin "${plugin}": devDependency "${name}" not allowed (allowed: ${ALLOWED_DEV_DEPENDENCIES.join(', ')})`,
      )
    return [...runtime, ...dev]
  })
}
