import { InvalidArgumentError } from "./errors.js";

export interface LossyFinding {
  readonly kind: string;
  readonly source: "markdown" | "html" | "adf";
  readonly count: number;
  /** Set when a documented step re-creates the node, so a rewrite does not lose it. */
  readonly handledBy?: "readback-to-md";
}

export interface LossyScanInput {
  readonly markdown?: string;
  readonly html?: string;
  readonly adf?: string;
}

// Node types md-to-adf can produce from Markdown; everything else in a stored ADF body is
// something a Markdown round trip would flatten.
const ADF_SAFE = new Set([
  "doc", "paragraph", "heading", "text", "hardBreak", "bulletList", "orderedList",
  "listItem", "codeBlock", "blockquote", "rule", "table", "tableRow", "tableHeader",
  "tableCell", "taskList", "taskItem", "inlineCard",
]);

const count = (text: string, re: RegExp): number => [...text.matchAll(re)].length;

function tally(items: readonly string[]): ReadonlyMap<string, number> {
  const byKey = new Map<string, number>();
  items.forEach((key) => byKey.set(key, (byKey.get(key) ?? 0) + 1));
  return byKey;
}

function scanMarkdown(md: string): LossyFinding[] {
  const media = count(md, /!\[[^\]]*\]\(blob:/g);
  const customTypes = [...md.matchAll(/<custom data-type="([^"]+)"/g)].map((m) => m[1]!);
  return [
    ...(media > 0 ? [{ kind: "media", source: "markdown" as const, count: media }] : []),
    ...[...tally(customTypes)].flatMap(([type, n]): LossyFinding[] => {
      if (type === "smartlink") return [];
      if (type === "mention") {
        return [{ kind: "mention", source: "markdown", count: n, handledBy: "readback-to-md" }];
      }
      return [{ kind: `custom:${type}`, source: "markdown", count: n }];
    }),
  ];
}

function scanHtml(html: string): LossyFinding[] {
  // An issue-key smart link is not lossy: drop it before looking for macros and lozenges.
  const withoutSmartLinks = html.replace(
    /<(a|span)\b[^>]*jira-issue-macro[^>]*>[\s\S]*?<\/\1>/g,
    "",
  );
  const found: LossyFinding[] = [
    {
      kind: "panel",
      source: "html",
      count: count(html, /class="[^"]*(?:\bpanel\b|ak-editor-panel)/g),
    },
    {
      kind: "mention",
      source: "html",
      count: count(html, /user-hover|data-user\b|data-account-id=/g),
      handledBy: "readback-to-md",
    },
    {
      kind: "macro",
      source: "html",
      count: count(withoutSmartLinks, /data-macro|status-macro|aui-lozenge/g),
    },
  ];
  return found.filter((f) => f.count > 0);
}

function collectAdfTypes(node: unknown): string[] {
  if (typeof node !== "object" || node === null) return [];
  const { type, content } = node as { type?: unknown; content?: unknown };
  const own = typeof type === "string" && (type === "mention" || !ADF_SAFE.has(type)) ? [type] : [];
  return [...own, ...(Array.isArray(content) ? content.flatMap(collectAdfTypes) : [])];
}

function scanAdf(raw: string): LossyFinding[] {
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    throw new InvalidArgumentError("--adf is not valid JSON");
  }
  return [...tally(collectAdfTypes(doc))].map(([kind, n]) => ({
    kind,
    source: "adf" as const,
    count: n,
    ...(kind === "mention" ? { handledBy: "readback-to-md" as const } : {}),
  }));
}

/** Everything in a Jira body that a Markdown rewrite could drop or flatten. */
export function scanLossy(input: LossyScanInput): readonly LossyFinding[] {
  if (input.markdown === undefined && input.html === undefined && input.adf === undefined) {
    throw new InvalidArgumentError("lossy-scan needs at least one of --file, --html, --adf");
  }
  return [
    ...(input.markdown === undefined ? [] : scanMarkdown(input.markdown)),
    ...(input.html === undefined ? [] : scanHtml(input.html)),
    ...(input.adf === undefined ? [] : scanAdf(input.adf)),
  ];
}

/** Findings that need `LOSSY:` in the preview and a preserve-or-approve decision. */
export const blocking = (findings: readonly LossyFinding[]): readonly LossyFinding[] =>
  findings.filter((f) => f.handledBy === undefined);
