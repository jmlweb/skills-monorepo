import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setupGithub } from "./setup-github.js";
import { openStubGh, type StubGh } from "../core/github-stub.test-support.js";
import { GhAuthError, GhRepoError } from "../core/errors.js";

let stub: StubGh;
let root: string;

beforeEach(async () => {
  stub = await openStubGh({ labels: [] });
  root = join(await mkdtemp(join(tmpdir(), "flowstate-setup-gh-")), ".backlog");
});

afterEach(async () => {
  await stub.close();
  await rm(join(root, ".."), { recursive: true, force: true });
});

describe("setup --github", () => {
  it("verifies auth and the repo, creates every flowstate label, and only learnings/ on disk", async () => {
    const result = await setupGithub(root, { repo: stub.repo, projectName: "Widgets" }, stub.gh);

    expect(result).toEqual({
      root,
      repo: stub.repo,
      labels: [
        "flowstate:task", "flowstate:idea", "flowstate:report",
        "status:active", "status:blocked", "status:approved", "status:discarded", "status:triaged",
        "P1", "P2", "P3", "P4",
      ],
    });
    expect((await stub.readState()).labels).toEqual(result.labels);
    const calls = await stub.calls();
    expect(calls[0]).toEqual(["auth", "status"]);
    expect(calls[1]).toEqual(["repo", "view", stub.repo, "--json", "nameWithOwner"]);
    expect(calls.filter((c) => c[0] === "label").every((c) => c.includes("--force"))).toBe(true);

    expect(await readdir(root)).toEqual(["learnings"]);
    expect((await readdir(join(root, "learnings"))).sort()).toEqual([".gitkeep", "index.md"]);
    expect(await readFile(join(root, "learnings", "index.md"), "utf-8")).toContain("# Widgets - Learnings Index");
  });

  it("is idempotent and keeps an existing learnings index", async () => {
    await setupGithub(root, { repo: stub.repo, projectName: "A" }, stub.gh);
    await writeFile(join(root, "learnings", "index.md"), "custom");
    await setupGithub(root, { repo: stub.repo, projectName: "B" }, stub.gh);
    expect(await readFile(join(root, "learnings", "index.md"), "utf-8")).toBe("custom");
    expect((await stub.readState()).labels).toHaveLength(12);
  });

  it("fails with GhAuthError before touching anything when gh is logged out", async () => {
    await stub.writeState({ ...(await stub.readState()), auth: false });
    await expect(setupGithub(root, { repo: stub.repo, projectName: "A" }, stub.gh)).rejects.toBeInstanceOf(GhAuthError);
    await expect(readdir(root)).rejects.toThrow();
    expect((await stub.readState()).labels).toEqual([]);
  });

  it("fails with GhRepoError when the repository does not resolve", async () => {
    await expect(setupGithub(root, { repo: "acme/nope", projectName: "A" }, stub.gh)).rejects.toBeInstanceOf(GhRepoError);
    await expect(readdir(root)).rejects.toThrow();
  });
});
