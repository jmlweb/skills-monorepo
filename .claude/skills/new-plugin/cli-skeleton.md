# CLI skeleton

Files and conventions for a CLI plugin, read by `new-plugin` Step 4.

- `tsconfig.json`: `{ "extends": "../../packages/shared-config/tsconfig.base.json", "compilerOptions": { "outDir": "./dist", "rootDir": "./src" }, "include": ["src"], "exclude": ["**/*.test.ts"] }`
- `vitest.config.ts`: include `src/**/*.test.ts` (copy from dev-workflow).
- `src/bin/<name>.ts`: copy the dispatcher shape from
  `plugins/dev-workflow/src/bin/dev-workflow.ts` — `parseFlags` (`--key value`, bare flag →
  `"true"`), `--json true` / `--cwd` globals, exit codes 0/1/2, `--help` usage text, `switch`
  dispatch to `src/commands/*`.
- `src/core/errors.ts`: typed error classes extending `Error`.
- Command modules: `export async function cmd(cwd: string, input: Input): Promise<Result>`
  with `readonly` interfaces, colocated `*.test.ts` (vitest, temp dirs via `mkdtemp`,
  assert on real file contents).
- Imports use explicit `.js` extensions (Node16 ESM).
