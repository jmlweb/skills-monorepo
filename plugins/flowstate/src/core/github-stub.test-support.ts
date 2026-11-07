import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createGhRunner, type GhRunner } from "./gh.js";

// Puts scripts/gh-stub.mjs first on PATH as `gh`, backed by a JSON state file, so a
// GithubStore under test spawns the same way it does in production and no test needs the
// network. The state file is readable and writable from the test for setup and assertions.
export const GH_STUB_SCRIPT = join(import.meta.dirname, "../../../../scripts/gh-stub.mjs");

export interface StubIssue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  state: "OPEN" | "CLOSED";
  stateReason?: string | null;
  isPullRequest?: boolean;
}

export interface StubState {
  repo: string;
  auth: boolean;
  nextNumber: number;
  labels: string[];
  issues: StubIssue[];
}

export interface StubGh {
  readonly repo: string;
  readonly binDir: string;
  readonly statePath: string;
  readonly env: NodeJS.ProcessEnv;
  readonly gh: GhRunner;
  readState(): Promise<StubState>;
  writeState(state: StubState): Promise<void>;
  // Every argv the stub received, in order.
  calls(): Promise<string[][]>;
  close(): Promise<void>;
}

export const FLOWSTATE_LABEL_NAMES = [
  "flowstate:task", "flowstate:idea", "flowstate:report",
  "status:active", "status:blocked", "status:approved", "status:discarded", "status:triaged",
  "P1", "P2", "P3", "P4",
];

export async function openStubGh(
  options: { readonly repo?: string; readonly auth?: boolean; readonly labels?: readonly string[] } = {},
): Promise<StubGh> {
  const dir = await mkdtemp(join(tmpdir(), "flowstate-gh-stub-"));
  const binDir = join(dir, "bin");
  const statePath = join(dir, "state.json");
  const repo = options.repo ?? "acme/widgets";
  await writeFile(statePath, JSON.stringify({
    repo,
    auth: options.auth ?? true,
    nextNumber: 1,
    labels: [...(options.labels ?? FLOWSTATE_LABEL_NAMES)],
    issues: [],
  }));
  await mkdir(binDir);
  await writeFile(join(binDir, "gh"), `#!/bin/sh\nexec node "${GH_STUB_SCRIPT}" "$@"\n`);
  await chmod(join(binDir, "gh"), 0o755);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${binDir}:${process.env["PATH"] ?? ""}`,
    GH_STUB_STATE: statePath,
  };
  return {
    repo,
    binDir,
    statePath,
    env,
    gh: createGhRunner({ env, cwd: dir }),
    readState: async () => JSON.parse(await readFile(statePath, "utf-8")) as StubState,
    writeState: (state) => writeFile(statePath, JSON.stringify(state, null, 2)),
    calls: async () => {
      try {
        const log = await readFile(`${statePath}.log`, "utf-8");
        return log.split("\n").filter((line) => line !== "").map((line) => JSON.parse(line) as string[]);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw err;
      }
    },
    close: () => rm(dir, { recursive: true, force: true }),
  };
}
