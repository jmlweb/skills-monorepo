import { describe, it, expect } from "vitest";
import { parseArgs, rejectUnknownFlags } from "./args.js";
import { InvalidArgumentError } from "./errors.js";

const SWITCHES = new Set(["json", "all"]);

describe("parseArgs", () => {
  it("stores values, repeated values and positionals", () => {
    const parsed = parseArgs(
      ["TSK-001", "--set", "a=1", "--set", "b=2", "--title", "Fix it", "extra"],
      SWITCHES,
    );
    expect(parsed.flags).toEqual({ set: "b=2", title: "Fix it" });
    expect(parsed.flagArrays).toEqual({ set: ["a=1", "b=2"], title: ["Fix it"] });
    expect(parsed.positional).toEqual(["TSK-001", "extra"]);
  });

  it("keeps an empty or whitespace-only value literally", () => {
    expect(parseArgs(["--title", ""], SWITCHES).flags).toEqual({ title: "" });
    expect(parseArgs(["--title", "   "], SWITCHES).flags).toEqual({ title: "   " });
  });

  it("keeps a value that starts with a single dash, such as a negative number", () => {
    expect(parseArgs(["--limit", "-1", "--body", "-"], SWITCHES).flags).toEqual({
      limit: "-1",
      body: "-",
    });
  });

  it("reads a bare switch as true and accepts an explicit value for it", () => {
    expect(parseArgs(["--json", "--all"], SWITCHES).flags).toEqual({ json: "true", all: "true" });
    expect(parseArgs(["--json", "true", "--title", "x"], SWITCHES).flags).toEqual({
      json: "true",
      title: "x",
    });
  });

  it("rejects a value flag with nothing after it", () => {
    expect(() => parseArgs(["--title"], SWITCHES)).toThrow(InvalidArgumentError);
    expect(() => parseArgs(["--title"], SWITCHES)).toThrow(/Flag --title needs a value\./);
  });

  it("rejects a value flag followed by another flag instead of storing true", () => {
    expect(() => parseArgs(["--title", "--json", "true"], SWITCHES)).toThrow(
      /Flag --title needs a value, but "--json" reads as the next flag/,
    );
    expect(() => parseArgs(["--log", "--x"], SWITCHES)).toThrow(/Values cannot start with --/);
  });
});

describe("rejectUnknownFlags", () => {
  const ACCEPTED = new Set(["title", "tags", "json"]);

  it("accepts flags that are all in the accepted set", () => {
    expect(() => rejectUnknownFlags("task-create", { title: "x", tags: "a", json: "true" }, ACCEPTED)).not.toThrow();
  });

  it("names the unknown flag, the command and the accepted flags", () => {
    expect(() => rejectUnknownFlags("task-create", { title: "x", tag: "cli" }, ACCEPTED)).toThrow(InvalidArgumentError);
    expect(() => rejectUnknownFlags("task-create", { title: "x", tag: "cli" }, ACCEPTED)).toThrow(
      "Unknown flag for task-create: --tag. Accepted flags: --title, --tags, --json.",
    );
  });

  it("names every unknown flag at once", () => {
    expect(() => rejectUnknownFlags("task-create", { tag: "a", depends: "b" }, ACCEPTED)).toThrow(
      /Unknown flags for task-create: --tag, --depends\./,
    );
  });
});
