import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { backendOf, resolveRepo, resolveStore, validateRepo } from "./backend.js";
import { FileStore } from "./file-store.js";
import { GithubStore } from "./github-store.js";
import { InvalidArgumentError } from "./errors.js";
import { openStubGh, type StubGh } from "./github-stub.test-support.js";

describe("backend selection", () => {
  let stub: StubGh;
  let root: string;

  beforeEach(async () => {
    stub = await openStubGh({ repo: "acme/remote" });
    root = await mkdtemp(join(tmpdir(), "flowstate-backend-"));
  });

  afterEach(async () => {
    await stub.close();
    await rm(root, { recursive: true, force: true });
  });

  it("selects github only for FLOWSTATE_BACKEND=github (case-insensitive); anything else is file", () => {
    expect(backendOf({})).toBe("file");
    expect(backendOf({ FLOWSTATE_BACKEND: "" })).toBe("file");
    expect(backendOf({ FLOWSTATE_BACKEND: "file" })).toBe("file");
    expect(backendOf({ FLOWSTATE_BACKEND: "gitlab" })).toBe("file");
    expect(backendOf({ FLOWSTATE_BACKEND: "github" })).toBe("github");
    expect(backendOf({ FLOWSTATE_BACKEND: " GitHub " })).toBe("github");
  });

  it("validates the owner/name form", () => {
    expect(validateRepo(" acme/widgets ")).toBe("acme/widgets");
    expect(() => validateRepo("widgets")).toThrow(InvalidArgumentError);
    expect(() => validateRepo("https://github.com/acme/widgets")).toThrow(/owner\/name/);
  });

  it("takes the repo from FLOWSTATE_GITHUB_REPO before asking gh", async () => {
    expect(await resolveRepo(stub.gh, { FLOWSTATE_GITHUB_REPO: "acme/configured" })).toBe("acme/configured");
    expect(await stub.calls()).toEqual([]);
  });

  it("falls back to gh repo view for the checkout's repository", async () => {
    expect(await resolveRepo(stub.gh, {})).toBe("acme/remote");
    expect(await stub.calls()).toEqual([["repo", "view", "--json", "nameWithOwner"]]);
  });

  it("resolveStore builds a FileStore on the root, or a GithubStore on the repo", async () => {
    const file = await resolveStore(root, root, {}, stub.gh);
    expect(file.backend).toBe("file");
    expect(file.store).toBeInstanceOf(FileStore);
    expect(file.repo).toBeUndefined();

    const github = await resolveStore(root, root, { FLOWSTATE_BACKEND: "github" }, stub.gh);
    expect(github.backend).toBe("github");
    expect(github.store).toBeInstanceOf(GithubStore);
    expect(github.repo).toBe("acme/remote");
  });
});
