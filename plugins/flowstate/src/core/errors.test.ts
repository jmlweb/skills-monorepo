import { describe, it, expect } from "vitest";
import {
  BacklogNotFoundError,
  EntityNotFoundError,
  InvalidArgumentError,
} from "./errors.js";

describe("BacklogNotFoundError", () => {
  it("extends Error and sets a named identifier", () => {
    const err = new BacklogNotFoundError("/tmp/nope");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(BacklogNotFoundError);
    expect(err.name).toBe("BacklogNotFoundError");
  });

  it("includes the cwd and setup hint in the message", () => {
    const err = new BacklogNotFoundError("/tmp/nope");
    expect(err.message).toContain("/tmp/nope");
    expect(err.message).toMatch(/flowstate setup/);
  });
});

describe("EntityNotFoundError", () => {
  it("extends Error and includes id and search path in the message", () => {
    const err = new EntityNotFoundError("TSK-001", "/backlog");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("EntityNotFoundError");
    expect(err.message).toContain("TSK-001");
    expect(err.message).toContain("/backlog");
  });
});

describe("InvalidArgumentError", () => {
  it("extends Error and surfaces the supplied message", () => {
    const err = new InvalidArgumentError("bad input");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("InvalidArgumentError");
    expect(err.message).toBe("bad input");
  });
});
