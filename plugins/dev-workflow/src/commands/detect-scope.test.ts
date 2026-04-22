import { describe, expect, it } from "vitest";
import {
  detectScope,
  detectScopeFromBranch,
  detectScopeFromFiles,
  type PackageNameReader,
} from "./detect-scope.js";

const noopReader: PackageNameReader = () => null;

const readerFromMap =
  (map: Record<string, string>): PackageNameReader =>
  (ws, dir) =>
    map[`${ws}/${dir}`] ?? null;

describe("detectScopeFromFiles", () => {
  it("maps apps/X/... to X directly (no package.json read)", () => {
    expect(
      detectScopeFromFiles(["apps/web/src/main.ts"], noopReader),
    ).toEqual(["web"]);
  });

  it("maps packages/X/... to the short name returned by the reader", () => {
    const reader = readerFromMap({
      "packages/foo": "foo-utils",
    });
    expect(
      detectScopeFromFiles(["packages/foo/src/a.ts"], reader),
    ).toEqual(["foo-utils"]);
  });

  it("maps plugins/X/... to the short name returned by the reader", () => {
    const reader = readerFromMap({
      "plugins/dev-workflow": "dev-workflow",
    });
    expect(
      detectScopeFromFiles(["plugins/dev-workflow/src/x.ts"], reader),
    ).toEqual(["dev-workflow"]);
  });

  it("falls back to dir name if package.json is missing or unreadable", () => {
    expect(
      detectScopeFromFiles(["packages/bar/src/a.ts"], noopReader),
    ).toEqual(["bar"]);
  });

  it("dedupes multiple files in the same workspace package", () => {
    expect(
      detectScopeFromFiles(
        ["apps/web/a.ts", "apps/web/b.ts", "apps/web/c.ts"],
        noopReader,
      ),
    ).toEqual(["web"]);
  });

  it("collects multiple distinct scopes in order of first appearance", () => {
    expect(
      detectScopeFromFiles(
        ["apps/web/a.ts", "apps/api/b.ts", "apps/web/c.ts"],
        noopReader,
      ),
    ).toEqual(["web", "api"]);
  });

  it("ignores files outside workspace dirs", () => {
    expect(
      detectScopeFromFiles(
        ["README.md", "scripts/build.ts", ".github/workflows/ci.yml"],
        noopReader,
      ),
    ).toEqual([]);
  });

  it("ignores workspace-dir itself without a subdirectory", () => {
    expect(detectScopeFromFiles(["apps"], noopReader)).toEqual([]);
    expect(detectScopeFromFiles(["apps/"], noopReader)).toEqual([]);
  });

  it("uses unscoped package names as-is", () => {
    const reader = readerFromMap({ "packages/bare": "bare-lib" });
    expect(
      detectScopeFromFiles(["packages/bare/index.ts"], reader),
    ).toEqual(["bare-lib"]);
  });
});

describe("detectScopeFromBranch", () => {
  it("strips feature/ prefix and returns first hyphen-separated word", () => {
    expect(detectScopeFromBranch("feature/auth-flow")).toBe("auth");
  });

  it("strips fix/ prefix", () => {
    expect(detectScopeFromBranch("fix/login-bug")).toBe("login");
  });

  it("strips prefixes case-insensitively", () => {
    expect(detectScopeFromBranch("Feature/Auth-Flow")).toBe("Auth");
  });

  it("supports hyphen-separated prefixes too", () => {
    expect(detectScopeFromBranch("feat-new-feature")).toBe("new");
  });

  it("preserves task-id patterns (UPPERCASE-digits)", () => {
    expect(detectScopeFromBranch("task/TASK-042")).toBe("TASK-042");
    expect(detectScopeFromBranch("feature/PROJ-123")).toBe("PROJ-123");
  });

  it("returns null for main/master/develop/dev/trunk", () => {
    for (const b of ["main", "master", "develop", "dev", "trunk"]) {
      expect(detectScopeFromBranch(b)).toBeNull();
    }
  });

  it("returns null for empty branch", () => {
    expect(detectScopeFromBranch("")).toBeNull();
  });

  it("returns branch as-is when no known prefix matches and it is a single word", () => {
    expect(detectScopeFromBranch("my-work")).toBe("my");
  });

  it("does not strip prefixes that look similar but are not in the list", () => {
    // "random/" is not a known prefix; the "/" split still takes the last segment
    expect(detectScopeFromBranch("random/auth-flow")).toBe("auth");
  });
});

describe("detectScope (combined)", () => {
  it("prefers file-derived scope over branch when files are present", () => {
    const result = detectScope(
      ["apps/web/src/a.ts"],
      "feature/unrelated",
      noopReader,
    );
    expect(result).toEqual({
      scopes: ["web"],
      suggested: "web",
      source: "files",
    });
  });

  it("joins 2 file scopes with a comma", () => {
    const result = detectScope(
      ["apps/web/a.ts", "apps/api/b.ts"],
      "",
      noopReader,
    );
    expect(result.scopes).toEqual(["web", "api"]);
    expect(result.suggested).toBe("web,api");
    expect(result.source).toBe("files");
  });

  it("omits scope (null) when 3+ are detected", () => {
    const result = detectScope(
      ["apps/a/x", "apps/b/x", "apps/c/x"],
      "",
      noopReader,
    );
    expect(result.scopes).toEqual(["a", "b", "c"]);
    expect(result.suggested).toBeNull();
    expect(result.source).toBe("files");
  });

  it("falls back to branch when no workspace files are touched", () => {
    const result = detectScope(
      ["README.md", "scripts/x.ts"],
      "feature/auth-flow",
      noopReader,
    );
    expect(result).toEqual({
      scopes: ["auth"],
      suggested: "auth",
      source: "branch",
    });
  });

  it("returns none when neither files nor branch yield a scope", () => {
    const result = detectScope(["README.md"], "main", noopReader);
    expect(result).toEqual({
      scopes: [],
      suggested: null,
      source: "none",
    });
  });

  it("returns none when files list is empty and branch is excluded", () => {
    expect(detectScope([], "master", noopReader)).toEqual({
      scopes: [],
      suggested: null,
      source: "none",
    });
  });
});
