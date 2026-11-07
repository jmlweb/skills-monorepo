import { describe, it, expect } from "vitest";
import { parseFlags } from "./args.js";
import { InvalidArgumentError } from "./errors.js";

const SWITCHES = new Set(["json"]);

describe("parseFlags", () => {
  it("stores values and skips positionals", () => {
    expect(parseFlags(["scan", "--range", "main...HEAD", "--cwd", "/tmp"], SWITCHES)).toEqual({
      range: "main...HEAD",
      cwd: "/tmp",
    });
  });

  it("keeps an empty or whitespace-only value literally", () => {
    expect(parseFlags(["--files", ""], SWITCHES)).toEqual({ files: "" });
    expect(parseFlags(["--files", "  "], SWITCHES)).toEqual({ files: "  " });
  });

  it("reads a bare switch as true and accepts an explicit value for it", () => {
    expect(parseFlags(["--json"], SWITCHES)).toEqual({ json: "true" });
    expect(parseFlags(["--json", "true"], SWITCHES)).toEqual({ json: "true" });
  });

  it("rejects a value flag with nothing after it", () => {
    expect(() => parseFlags(["--file"], SWITCHES)).toThrow(InvalidArgumentError);
    expect(() => parseFlags(["--file"], SWITCHES)).toThrow(/Flag --file needs a value\./);
  });

  it("rejects a value flag followed by another flag instead of storing true", () => {
    expect(() => parseFlags(["--file", "--json"], SWITCHES)).toThrow(
      /Flag --file needs a value, but "--json" reads as the next flag/,
    );
  });
});
