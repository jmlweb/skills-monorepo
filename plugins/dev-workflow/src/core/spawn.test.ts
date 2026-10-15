import { describe, expect, it } from "vitest";
import { TestCommandError } from "./errors.js";
import { runCommand } from "./spawn.js";

describe("runCommand", () => {
  it("returns exit code and output without a shell", () => {
    const result = runCommand(process.cwd(), ["node", "-e", "console.log('hi $HOME')"], 10_000);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("hi $HOME");
  });

  it("reports a timed-out run as a result, not an error", () => {
    const result = runCommand(process.cwd(), ["node", "-e", "setTimeout(() => {}, 5000)"], 200);
    expect(result.timedOut).toBe(true);
  });

  it("throws a typed error for a missing program", () => {
    expect(() => runCommand(process.cwd(), ["no-such-program-xyz"], 1000)).toThrow(TestCommandError);
  });

  it("rejects an empty argv", () => {
    expect(() => runCommand(process.cwd(), [], 1000)).toThrow(TestCommandError);
  });
});
