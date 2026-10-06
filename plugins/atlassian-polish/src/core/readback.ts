import { InvalidArgumentError } from "./errors.js";

const CUSTOM_RE = /<custom data-type="([^"]+)"[^>]*>([\s\S]*?)<\/custom>/g;
const ACCOUNT_RE = /data-account-id="([^"]+)"/g;
const BROWSE_RE = /\/browse\/([A-Z][A-Z0-9]*-\d+)\/?$/;

/**
 * The Jira MCP reads smart links and mentions back as `<custom>` tags, which a Markdown
 * write would flatten. Turn them into the syntax md-to-adf re-creates: bare issue keys and
 * `[@Name](mention:<accountId>)`. Account IDs come from the rendered HTML, in order, since
 * the tag's data-id is only a per-response counter.
 */
export function readbackToMarkdown(markdown: string, renderedHtml: string): string {
  const accounts = [...renderedHtml.matchAll(ACCOUNT_RE)].map((m) => m[1]!);
  const mentions = [...markdown.matchAll(CUSTOM_RE)].filter((m) => m[1] === "mention");
  if (mentions.length !== accounts.length) {
    throw new InvalidArgumentError(
      `found ${mentions.length} mention(s) in the Markdown but ${accounts.length} account ID(s) in the HTML; pass the renderedFields.description from the same fetch`,
    );
  }
  const unknown = new Set<string>();
  let next = 0;
  const out = markdown.replace(CUSTOM_RE, (whole, type: string, inner: string) => {
    if (type === "mention") {
      return `[@${inner.replace(/^@/, "")}](mention:${accounts[next++]})`;
    }
    if (type === "smartlink") {
      return BROWSE_RE.exec(inner.trim())?.[1] ?? inner.trim();
    }
    unknown.add(type);
    return whole;
  });
  if (unknown.size > 0) {
    throw new InvalidArgumentError(
      `unsupported <custom> node(s): ${[...unknown].join(", ")}; leave those sections out of the write or ask the user`,
    );
  }
  return out;
}
