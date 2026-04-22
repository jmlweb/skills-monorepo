import { describe, expect, it } from "vitest";
import type { PackageInfo } from "../core/packages.js";
import { detectPackages, type PackageReader } from "./detect-packages.js";

const pkg = (
  dir: string,
  name: string,
  isPrivate = false,
): PackageInfo => ({
  dir,
  name,
  shortName: name.includes("/") ? name.slice(name.lastIndexOf("/") + 1) : name,
  private: isPrivate,
});

const readerFromMap =
  (map: Record<string, PackageInfo>): PackageReader =>
  (relDir) =>
    map[relDir] ?? null;

describe("detectPackages", () => {
  it("returns a single package for multiple staged files under it", () => {
    const reader = readerFromMap({
      "packages/foo": pkg("packages/foo", "@scope/foo-utils"),
    });
    const result = detectPackages(
      ["packages/foo/src/a.ts", "packages/foo/src/b.ts"],
      reader,
    );
    expect(result).toEqual([
      {
        name: "@scope/foo-utils",
        shortName: "foo-utils",
        private: false,
        dir: "packages/foo",
      },
    ]);
  });

  it("detects multiple packages in order of first appearance", () => {
    const reader = readerFromMap({
      "packages/a": pkg("packages/a", "pkg-a"),
      "packages/b": pkg("packages/b", "pkg-b"),
    });
    const result = detectPackages(
      ["packages/b/x.ts", "packages/a/x.ts", "packages/b/y.ts"],
      reader,
    );
    expect(result.map((p) => p.shortName)).toEqual(["pkg-b", "pkg-a"]);
  });

  it("filters private packages by default", () => {
    const reader = readerFromMap({
      "packages/pub": pkg("packages/pub", "public-pkg"),
      "apps/web": pkg("apps/web", "web-app", true),
    });
    const result = detectPackages(
      ["packages/pub/x.ts", "apps/web/x.ts"],
      reader,
    );
    expect(result.map((p) => p.shortName)).toEqual(["public-pkg"]);
  });

  it("keeps private packages when includePrivate is true", () => {
    const reader = readerFromMap({
      "apps/web": pkg("apps/web", "web-app", true),
    });
    const result = detectPackages(["apps/web/x.ts"], reader, {
      includePrivate: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.private).toBe(true);
  });

  it("skips files whose package.json is missing", () => {
    const result = detectPackages(
      ["packages/ghost/x.ts", "packages/real/x.ts"],
      readerFromMap({
        "packages/real": pkg("packages/real", "real-pkg"),
      }),
    );
    expect(result.map((p) => p.shortName)).toEqual(["real-pkg"]);
  });

  it("ignores files outside known workspace dirs", () => {
    const result = detectPackages(
      ["README.md", "scripts/x.ts", ".github/ci.yml"],
      () => null,
    );
    expect(result).toEqual([]);
  });

  it("covers apps, packages, and plugins", () => {
    const reader = readerFromMap({
      "apps/web": pkg("apps/web", "web-app"),
      "packages/lib": pkg("packages/lib", "lib-pkg"),
      "plugins/tool": pkg("plugins/tool", "tool-plugin"),
    });
    const result = detectPackages(
      ["apps/web/a.ts", "packages/lib/b.ts", "plugins/tool/c.ts"],
      reader,
    );
    expect(result.map((p) => p.shortName).sort()).toEqual([
      "lib-pkg",
      "tool-plugin",
      "web-app",
    ]);
  });

  it("does not call the reader twice for the same dir", () => {
    let calls = 0;
    const reader: PackageReader = (dir) => {
      calls++;
      return pkg(dir, "only");
    };
    detectPackages(
      ["packages/foo/a.ts", "packages/foo/b.ts", "packages/foo/c.ts"],
      reader,
    );
    expect(calls).toBe(1);
  });
});
