export type FindingReason = "sensitive-filename" | "secret-pattern";

export type Finding = {
  file: string;
  reason: FindingReason;
  pattern: string;
  line?: number;
  preview?: string;
};

export type ScanResult = {
  findings: Finding[];
};

type NamedPattern = {
  readonly name: string;
  readonly regex: RegExp;
};

const FILENAME_PATTERNS: readonly NamedPattern[] = [
  { name: "env file", regex: /(?:^|\/)\.env(?:\..+)?$/ },
  {
    name: "credentials/secrets json",
    regex: /(?:^|\/)(?:credentials|secrets)\.json$/i,
  },
  { name: "pem/key/crt", regex: /\.(?:pem|key|crt|p12|pfx)$/i },
  {
    name: "ssh key",
    regex: /(?:^|\/)id_(?:rsa|dsa|ecdsa|ed25519)(?:\..+)?$/,
  },
  { name: "npm/yarn config", regex: /(?:^|\/)\.(?:npmrc|yarnrc)$/ },
  {
    name: "secret in filename",
    regex: /(?:api[_-]?key|secret|password|passwd)/i,
  },
];

const CONTENT_PATTERNS: readonly NamedPattern[] = [
  { name: "stripe live key", regex: /\bsk_live_[A-Za-z0-9]{16,}\b/ },
  { name: "stripe restricted key", regex: /\brk_live_[A-Za-z0-9]{16,}\b/ },
  { name: "google api key", regex: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "github token", regex: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: "npm token", regex: /\bnpm_[A-Za-z0-9]{36}\b/ },
  { name: "aws access key", regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  {
    name: "slack token",
    regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/,
  },
  {
    name: "private key block",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
  },
  {
    name: "db connection string",
    regex:
      /\b(?:postgres(?:ql)?|mongodb(?:\+srv)?|mysql|redis):\/\/[^\s'"`<>]*:[^\s'"`<>@]+@[^\s'"`<>]+/,
  },
  {
    name: "hardcoded password",
    regex:
      /(?:^|[^A-Za-z0-9_])(?:password|passwd|pwd)\s*[:=]\s*['"][^'"\s]{6,}['"]/i,
  },
];

export function scanFilenames(files: readonly string[]): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    for (const { name, regex } of FILENAME_PATTERNS) {
      if (regex.test(file)) {
        findings.push({ file, reason: "sensitive-filename", pattern: name });
        break;
      }
    }
  }
  return findings;
}

export function scanDiff(diff: string): Finding[] {
  const findings: Finding[] = [];
  let currentFile = "";
  let newLineNo = 0;

  for (const rawLine of diff.split("\n")) {
    if (rawLine.startsWith("+++ ")) {
      currentFile = headerPath(rawLine.slice(4));
      continue;
    }
    if (rawLine.startsWith("--- ")) continue;
    if (rawLine.startsWith("diff --git")) {
      currentFile = "";
      continue;
    }
    if (rawLine.startsWith("@@")) {
      const match = /\+(\d+)(?:,\d+)?/.exec(rawLine);
      newLineNo = match ? parseInt(match[1]!, 10) : 0;
      continue;
    }
    if (!currentFile) continue;

    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      const text = rawLine.slice(1);
      for (const { name, regex } of CONTENT_PATTERNS) {
        const match = regex.exec(text);
        if (match) {
          findings.push({
            file: currentFile,
            reason: "secret-pattern",
            pattern: name,
            line: newLineNo,
            preview: redact(text, match[0]),
          });
        }
      }
      newLineNo++;
    } else if (rawLine.startsWith(" ")) {
      newLineNo++;
    }
  }

  return findings;
}

// Any header we do not recognise still yields a path, so its added lines are
// scanned instead of silently skipped. Git appends a tab to unquoted paths
// that contain a space.
function headerPath(rawHeader: string): string {
  const rawPath = rawHeader.endsWith("\t") ? rawHeader.slice(0, -1) : rawHeader;
  const path = rawPath.startsWith('"') ? unquoteGitPath(rawPath) : rawPath;
  if (path === "/dev/null") return "";
  return path.startsWith("b/") ? path.slice(2) : path;
}

const C_ESCAPES: Readonly<Record<string, number>> = {
  a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, "\\": 92,
};

// Git C-quotes paths with special characters; octal escapes are raw UTF-8 bytes.
function unquoteGitPath(quoted: string): string {
  const body = quoted.endsWith('"') ? quoted.slice(1, -1) : quoted.slice(1);
  const bytes: number[] = [];
  for (let i = 0; i < body.length; i++) {
    const char = body[i]!;
    if (char !== "\\") {
      bytes.push(...Buffer.from(char, "utf-8"));
      continue;
    }
    const octal = /^[0-7]{3}/.exec(body.slice(i + 1));
    if (octal) {
      bytes.push(parseInt(octal[0], 8));
      i += 3;
      continue;
    }
    const next = body[i + 1];
    if (next !== undefined) bytes.push(C_ESCAPES[next] ?? next.charCodeAt(0));
    i += 1;
  }
  return Buffer.from(bytes).toString("utf-8");
}

export function scanSecrets(
  files: readonly string[],
  diff: string,
): ScanResult {
  return {
    findings: [...scanFilenames(files), ...scanDiff(diff)],
  };
}

function redact(line: string, match: string): string {
  const masked =
    match.length > 8
      ? `${match.slice(0, 4)}…${match.slice(-2)}`
      : "***";
  return line.replace(match, masked).trim().slice(0, 120);
}
