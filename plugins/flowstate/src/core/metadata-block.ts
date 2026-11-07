import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";
import { MetadataBlockError } from "./errors.js";

// Frontmatter fields that have no label or title equivalent travel in a fenced block at the
// top of the issue body, in the same `key: value` syntax as the file frontmatter so one
// parser serves both. Humans editing the issue on github.com see it as a code block.
export const METADATA_FENCE = "```flowstate";
const CLOSING_FENCE = "```";

export interface SplitBody {
  readonly metadata: Record<string, unknown>;
  // The issue body without the block, in the shape file-mode commands expect.
  readonly body: string;
}

// A body without a block (an issue created by hand) reads as empty metadata; the next
// save writes one. An opened block that never closes, or a line inside it without a
// colon, is malformed and fails loudly instead of being guessed at.
export function splitMetadataBlock(issueBody: string, issueNumber: number): SplitBody {
  const lines = issueBody.split("\n");
  let start = 0;
  while (start < lines.length && lines[start]!.trim() === "") start += 1;
  if (lines[start]?.trim() !== METADATA_FENCE) {
    return { metadata: {}, body: issueBody };
  }

  const end = lines.findIndex((line, i) => i > start && line.trim() === CLOSING_FENCE);
  if (end === -1) {
    throw new MetadataBlockError(issueNumber, "the opening ```flowstate fence has no closing ```");
  }

  const inner = lines.slice(start + 1, end);
  for (const line of inner) {
    if (line.trim() !== "" && !line.includes(":")) {
      throw new MetadataBlockError(issueNumber, `line "${line}" is not "key: value"`);
    }
  }

  const { frontmatter } = parseFrontmatter(["---", ...inner, "---", ""].join("\n"));
  return { metadata: frontmatter, body: lines.slice(end + 1).join("\n") };
}

export function joinMetadataBlock(metadata: Readonly<Record<string, unknown>>, body: string): string {
  // serializeFrontmatter yields "---\nk: v\n---\n<body>"; swap the delimiters for fences.
  const serialized = serializeFrontmatter({ ...metadata }, "");
  const inner = serialized.split("\n").slice(1, -2);
  const block = [METADATA_FENCE, ...inner, CLOSING_FENCE].join("\n");
  // One newline after the fence, so a body that starts with "\n" round-trips byte for byte.
  return `${block}\n${body}`;
}
