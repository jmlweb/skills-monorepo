import { describe, it, expect } from "vitest";
import { titleToSlug } from "./slug.js";

describe("titleToSlug", () => {
  it("converts title to lowercase hyphenated slug", () => {
    expect(titleToSlug("Fix Auth Bug")).toBe("fix-auth-bug");
  });

  it("limits to 5 words", () => {
    expect(titleToSlug("This Is A Very Long Title Indeed")).toBe(
      "this-is-a-very-long",
    );
  });

  it("strips special characters", () => {
    expect(titleToSlug("Fix: auth (token) expired!")).toBe(
      "fix-auth-token-expired",
    );
  });

  it("collapses multiple hyphens", () => {
    expect(titleToSlug("Fix  ---  auth")).toBe("fix-auth");
  });

  it("trims leading/trailing hyphens", () => {
    expect(titleToSlug("  Fix auth  ")).toBe("fix-auth");
  });

  it("handles single word", () => {
    expect(titleToSlug("Refactor")).toBe("refactor");
  });
});
