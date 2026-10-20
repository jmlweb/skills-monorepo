import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkSandbox, createSandbox, MAX_GIF_BYTES, PROJECT } from "./sandbox-readme-media.mjs";

function withSandbox(fn) {
  const dir = mkdtempSync(join(tmpdir(), "readme-media-sandbox-"));
  try {
    createSandbox(dir);
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Simulates a successful skill run: a GIF and its tape in docs/media, embedded in the README.
function landMedia(dir, { gifBytes = 1024, tape = true, embed = true } = {}) {
  const media = join(dir, PROJECT, "docs", "media");
  mkdirSync(media, { recursive: true });
  const gif = Buffer.alloc(gifBytes);
  gif.write("GIF89a");
  writeFileSync(join(media, "task-list.gif"), gif);
  if (tape) writeFileSync(join(media, "task-list.tape"), 'Output "docs/media/task-list.gif"\n');
  if (embed) {
    const readme = join(dir, PROJECT, "README.md");
    writeFileSync(readme, `${readFileSync(readme, "utf-8")}\n![Listing tasks](docs/media/task-list.gif)\n`);
  }
}

const failuresOf = (dir) => checkSandbox(dir).failures;

test("a fresh sandbox is a workspace root whose sub-project runs its CLI", () => {
  withSandbox((dir) => {
    assert.match(readFileSync(join(dir, "pnpm-workspace.yaml"), "utf-8"), /plugins\/\*/);
    const help = execFileSync("node", [join(dir, PROJECT, "dist", "bin", "flowstate.js"), "--help"], { encoding: "utf-8" });
    assert.match(help, /flowstate/i);
  });
});

test("a fresh sandbox fails because no GIF landed yet", () => {
  withSandbox((dir) => {
    assert.ok(failuresOf(dir).some((f) => f.startsWith("no GIF in")));
  });
});

test("a GIF with its tape, embedded in the README, passes", () => {
  withSandbox((dir) => {
    landMedia(dir);
    assert.deepEqual(failuresOf(dir), []);
  });
});

test("flags a GIF without its tape, a README without the embed, and an oversized GIF", () => {
  withSandbox((dir) => {
    landMedia(dir, { gifBytes: MAX_GIF_BYTES + 1, tape: false, embed: false });
    const failures = failuresOf(dir);
    assert.ok(failures.some((f) => f.startsWith("no .tape")));
    assert.ok(failures.some((f) => f.startsWith("README does not embed")));
    assert.ok(failures.some((f) => f.startsWith("GIF over")));
  });
});

test("flags a file that is not a GIF", () => {
  withSandbox((dir) => {
    landMedia(dir);
    writeFileSync(join(dir, PROJECT, "docs", "media", "task-list.gif"), "not a gif");
    assert.ok(failuresOf(dir).some((f) => f.startsWith("not a GIF")));
  });
});

test("flags a commit, staged files, and state written outside the media folder", () => {
  withSandbox((dir) => {
    landMedia(dir);
    mkdirSync(join(dir, PROJECT, ".backlog"));
    writeFileSync(join(dir, PROJECT, ".backlog", "config.yaml"), "");
    execFileSync("git", ["add", "-A"], { cwd: dir });
    const failures = failuresOf(dir);
    assert.ok(failures.some((f) => f.startsWith("files are staged")));
    assert.ok(failures.some((f) => f.startsWith("files outside")));
    execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-qm", "media"], { cwd: dir });
    assert.ok(failuresOf(dir).some((f) => f.startsWith("a commit was made")));
  });
});
