import { describe, expect, it } from "vitest";
import {
  scanDiff,
  scanFilenames,
  scanSecrets,
} from "./scan-secrets.js";

describe("scanFilenames", () => {
  it("flags .env variants", () => {
    const findings = scanFilenames([".env", ".env.local", "app/.env.prod"]);
    expect(findings).toHaveLength(3);
    for (const f of findings) {
      expect(f.reason).toBe("sensitive-filename");
      expect(f.pattern).toBe("env file");
    }
  });

  it("flags credentials and secrets json", () => {
    const findings = scanFilenames([
      "credentials.json",
      "config/secrets.json",
    ]);
    expect(findings).toHaveLength(2);
    expect(findings.every((f) => f.pattern === "credentials/secrets json")).toBe(true);
  });

  it("flags pem/key/crt/p12/pfx", () => {
    const findings = scanFilenames([
      "server.pem",
      "client.key",
      "cert.crt",
      "keystore.p12",
      "identity.pfx",
    ]);
    expect(findings).toHaveLength(5);
    expect(findings.every((f) => f.pattern === "pem/key/crt")).toBe(true);
  });

  it("flags ssh keys", () => {
    const findings = scanFilenames([".ssh/id_rsa", "id_ed25519.pub"]);
    expect(findings).toHaveLength(2);
    expect(findings.every((f) => f.pattern === "ssh key")).toBe(true);
  });

  it("flags npmrc/yarnrc at any depth", () => {
    const findings = scanFilenames([".npmrc", "packages/a/.yarnrc"]);
    expect(findings).toHaveLength(2);
  });

  it("flags API_KEY/SECRET/PASSWORD in filename", () => {
    const findings = scanFilenames([
      "config/API_KEY.ts",
      "src/secret-store.ts",
      "password-utils.ts",
    ]);
    expect(findings).toHaveLength(3);
  });

  it("returns empty for safe filenames", () => {
    const findings = scanFilenames([
      "src/app.ts",
      "README.md",
      "package.json",
    ]);
    expect(findings).toEqual([]);
  });

  it("emits one finding per file even if multiple patterns match", () => {
    const findings = scanFilenames(["config/.env.SECRET"]);
    expect(findings).toHaveLength(1);
  });
});

describe("scanDiff", () => {
  it("detects stripe live key with line number", () => {
    const diff = [
      "diff --git a/src/pay.ts b/src/pay.ts",
      "--- a/src/pay.ts",
      "+++ b/src/pay.ts",
      "@@ -10,0 +11,1 @@",
      '+const key = "sk_live_xxxxxxxxxxxxxxxxxx"',
    ].join("\n");

    const findings = scanDiff(diff);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      file: "src/pay.ts",
      reason: "secret-pattern",
      pattern: "stripe live key",
      line: 11,
    });
    expect(findings[0]!.preview).not.toContain("sk_live_xxxxxxxxxxxxxxxxxx");
    expect(findings[0]!.preview).toContain("sk_l");
  });

  it("detects google api key", () => {
    const diff = [
      "diff --git a/a.ts b/a.ts",
      "+++ b/a.ts",
      "@@ -0,0 +1,1 @@",
      '+const k = "AIzaSyA1234567890abcdefghijklmnopqrstuv"',
    ].join("\n");
    const findings = scanDiff(diff);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.pattern).toBe("google api key");
  });

  it("detects github tokens (multiple prefixes)", () => {
    const diff = [
      "diff --git a/a.ts b/a.ts",
      "+++ b/a.ts",
      "@@ -0,0 +1,2 @@",
      "+ghp_1234567890abcdefghijklmnopqrstuvwxyz",
      "+ghs_1234567890abcdefghijklmnopqrstuvwxyz",
    ].join("\n");
    const findings = scanDiff(diff);
    expect(findings).toHaveLength(2);
    expect(findings.every((f) => f.pattern === "github token")).toBe(true);
  });

  it("detects aws access keys", () => {
    const diff = [
      "diff --git a/a.ts b/a.ts",
      "+++ b/a.ts",
      "@@ -0,0 +1,1 @@",
      "+AKIAIOSFODNN7EXAMPLE",
    ].join("\n");
    expect(scanDiff(diff)).toHaveLength(1);
  });

  it("detects private key blocks", () => {
    const diff = [
      "diff --git a/a b/a",
      "+++ b/a",
      "@@ -0,0 +1,1 @@",
      "+-----BEGIN RSA PRIVATE KEY-----",
    ].join("\n");
    expect(scanDiff(diff)[0]!.pattern).toBe("private key block");
  });

  it("detects db connection strings with credentials", () => {
    const diff = [
      "diff --git a/a.ts b/a.ts",
      "+++ b/a.ts",
      "@@ -0,0 +1,1 @@",
      '+const url = "postgres://user:hunter2@db.example.com:5432/app"',
    ].join("\n");
    expect(scanDiff(diff)[0]!.pattern).toBe("db connection string");
  });

  it("detects hardcoded password assignments", () => {
    const diff = [
      "diff --git a/a.ts b/a.ts",
      "+++ b/a.ts",
      "@@ -0,0 +1,1 @@",
      '+const password = "correcthorsebattery"',
    ].join("\n");
    expect(scanDiff(diff)[0]!.pattern).toBe("hardcoded password");
  });

  it("ignores removed lines", () => {
    const diff = [
      "diff --git a/a.ts b/a.ts",
      "+++ b/a.ts",
      "@@ -1,1 +0,0 @@",
      '-const old = "sk_live_xxxxxxxxxxxxxxxx"',
    ].join("\n");
    expect(scanDiff(diff)).toEqual([]);
  });

  it("returns empty for clean diffs", () => {
    const diff = [
      "diff --git a/a.ts b/a.ts",
      "+++ b/a.ts",
      "@@ -0,0 +1,1 @@",
      "+const x = 1",
    ].join("\n");
    expect(scanDiff(diff)).toEqual([]);
  });

  it("tracks line numbers across multiple hunks", () => {
    const diff = [
      "diff --git a/a.ts b/a.ts",
      "+++ b/a.ts",
      "@@ -0,0 +5,1 @@",
      "+const k1 = \"AIzaSyA1234567890abcdefghijklmnopqrstuv\"",
      "@@ -10,0 +20,1 @@",
      "+const k2 = \"AIzaSyB1234567890abcdefghijklmnopqrstuv\"",
    ].join("\n");
    const findings = scanDiff(diff);
    expect(findings[0]!.line).toBe(5);
    expect(findings[1]!.line).toBe(20);
  });
});

describe("scanSecrets", () => {
  it("combines filename and content findings", () => {
    const files = [".env.local"];
    const diff = [
      "diff --git a/src/app.ts b/src/app.ts",
      "+++ b/src/app.ts",
      "@@ -0,0 +1,1 @@",
      "+const k = \"AIzaSyA1234567890abcdefghijklmnopqrstuv\"",
    ].join("\n");

    const result = scanSecrets(files, diff);
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0]!.reason).toBe("sensitive-filename");
    expect(result.findings[1]!.reason).toBe("secret-pattern");
  });

  it("returns empty findings when nothing is flagged", () => {
    expect(scanSecrets(["src/app.ts"], "")).toEqual({ findings: [] });
  });
});
