import { spawnSync } from "node:child_process";
import { TestCommandError } from "./errors.js";

const MAX_BUFFER = 64 * 1024 * 1024;

export type CommandResult = {
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly durationMs: number;
  readonly stdout: string;
  readonly stderr: string;
};

// argv runs without a shell so a file path can never be read as shell syntax.
// A timed-out run is a result, not an error: the caller decides what it means.
export function runCommand(
  cwd: string,
  argv: readonly string[],
  timeoutMs: number,
): CommandResult {
  const [program, ...args] = argv;
  if (!program) {
    throw new TestCommandError("Test command is empty.");
  }
  const started = Date.now();
  const result = spawnSync(program, args, {
    cwd,
    encoding: "utf-8",
    maxBuffer: MAX_BUFFER,
    timeout: timeoutMs,
    killSignal: "SIGKILL",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const durationMs = Date.now() - started;
  const code = (result.error as NodeJS.ErrnoException | undefined)?.code;
  if (code === "ENOENT") {
    throw new TestCommandError(`Command not found: ${program}`);
  }
  if (result.error && code !== "ETIMEDOUT") {
    throw new TestCommandError(`${program} failed to run: ${result.error.message}`);
  }
  return {
    exitCode: result.status,
    timedOut: code === "ETIMEDOUT",
    durationMs,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}
