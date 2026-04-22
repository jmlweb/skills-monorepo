import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { today } from "./date.js";

describe("today", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current date in YYYY-MM-DD format", () => {
    vi.setSystemTime(new Date("2026-04-22T10:30:00.000Z"));
    expect(today()).toBe("2026-04-22");
  });

  it("truncates the time portion", () => {
    vi.setSystemTime(new Date("2026-12-31T23:59:59.999Z"));
    expect(today()).toBe("2026-12-31");
  });

  it("returns a value that matches the ISO date shape", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
