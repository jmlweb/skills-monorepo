import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createGhRunner, ghJson, classifyGhFailure } from "./gh.js";
import { openStubGh, type StubGh } from "./github-stub.test-support.js";
import {
  GhAuthError,
  GhCommandError,
  GhMissingError,
  GhRepoError,
} from "./errors.js";

describe("gh runner", () => {
  let stub: StubGh;

  beforeEach(async () => {
    stub = await openStubGh();
  });

  afterEach(async () => {
    await stub.close();
  });

  it("throws GhMissingError when gh is not on PATH", async () => {
    const empty = await mkdtemp(join(tmpdir(), "flowstate-nogh-"));
    try {
      const gh = createGhRunner({ env: { ...process.env, PATH: empty } });
      await expect(gh(["auth", "status"])).rejects.toBeInstanceOf(GhMissingError);
      await expect(gh(["auth", "status"])).rejects.toThrow(/cli.github.com/);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });

  it("maps a logged-out gh to GhAuthError with the login hint", async () => {
    await stub.writeState({ ...(await stub.readState()), auth: false });
    await expect(stub.gh(["auth", "status"])).rejects.toBeInstanceOf(GhAuthError);
    await expect(stub.gh(["auth", "status"])).rejects.toThrow(/gh auth login/);
  });

  it("maps an unresolvable repository to GhRepoError naming the repo", async () => {
    const err = await stub.gh(["issue", "list", "--repo", "acme/other", "--json", "number"]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GhRepoError);
    expect((err as Error).message).toContain('"acme/other"');
    expect((err as Error).message).toContain("FLOWSTATE_GITHUB_REPO");
  });

  it("maps any other failure to GhCommandError carrying the args and stderr", async () => {
    const err = await stub.gh(["issue", "frobnicate"]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GhCommandError);
    expect((err as Error).message).toContain("gh issue frobnicate failed");
    expect((err as Error).message).toContain("unsupported command");
  });

  it("passes stdin through and returns stdout", async () => {
    const url = await stub.gh(
      ["issue", "create", "--repo", stub.repo, "--title", "T", "--body-file", "-", "--label", "flowstate:task"],
      { input: "hello body" },
    );
    expect(url.trim()).toBe(`https://github.com/${stub.repo}/issues/1`);
    expect((await stub.readState()).issues[0]?.body).toBe("hello body");
  });

  it("ghJson parses JSON and rejects anything else loudly", async () => {
    expect(await ghJson<{ nameWithOwner: string }>(stub.gh, ["repo", "view", "--json", "nameWithOwner"])).toEqual({
      nameWithOwner: stub.repo,
    });
    await expect(ghJson(stub.gh, ["auth", "status"])).rejects.toThrow(/non-JSON output/);
  });

  it("classifies by stderr, since gh exits 1 for every kind of failure", () => {
    expect(classifyGhFailure(["x"], "To get started with GitHub CLI, please run:  gh auth login")).toBeInstanceOf(GhAuthError);
    expect(classifyGhFailure(["issue", "list", "-R", "a/b"], "GraphQL: Could not resolve to a Repository with the name 'a/b'.")).toBeInstanceOf(GhRepoError);
    expect(classifyGhFailure(["repo", "view"], "none of the git remotes configured for this repository point to a known GitHub host")).toBeInstanceOf(GhCommandError);
    expect(classifyGhFailure(["x"], "HTTP 502")).toBeInstanceOf(GhCommandError);
  });
});
