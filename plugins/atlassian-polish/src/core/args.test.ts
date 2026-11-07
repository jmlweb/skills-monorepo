import { describe, it, expect } from "vitest";
import { parseFlags } from "./args.js";
import { InvalidArgumentError } from "./errors.js";

const SWITCHES = new Set(["pretty"]);

describe("parseFlags", () => {
  it("stores values and skips positionals", () => {
    expect(parseFlags(["md-to-adf", "--file", "in.md", "--projects", "A,B"], SWITCHES)).toEqual({
      file: "in.md",
      projects: "A,B",
    });
  });

  it("keeps an empty value literally", () => {
    expect(parseFlags(["--projects", ""], SWITCHES)).toEqual({ projects: "" });
  });

  it("reads a bare switch as true and accepts an explicit value for it", () => {
    expect(parseFlags(["--pretty"], SWITCHES)).toEqual({ pretty: "true" });
    expect(parseFlags(["--pretty", "true"], SWITCHES)).toEqual({ pretty: "true" });
  });

  it("rejects a value flag with nothing after it", () => {
    expect(() => parseFlags(["--file"], SWITCHES)).toThrow(InvalidArgumentError);
    expect(() => parseFlags(["--file"], SWITCHES)).toThrow(/Flag --file needs a value\./);
  });

  it("rejects a value flag followed by another flag instead of storing true", () => {
    expect(() => parseFlags(["--file", "--pretty"], SWITCHES)).toThrow(
      /Flag --file needs a value, but "--pretty" reads as the next flag/,
    );
  });
});
