import { describe, it, expect } from "vitest";
import { joinMetadataBlock, splitMetadataBlock } from "./metadata-block.js";
import { MetadataBlockError } from "./errors.js";

describe("metadata block", () => {
  it("round-trips a body that starts with a blank line, byte for byte", () => {
    const body = "\n# Title\n\n## Notes\n\ntext\n";
    const metadata = { created: "2026-11-07", source: "manual", "depends-on": ["TSK-001", "TSK-002"], tagsless: "" };
    const issueBody = joinMetadataBlock(metadata, body);

    expect(issueBody.startsWith("```flowstate\ncreated: 2026-11-07\nsource: manual\ndepends-on: [TSK-001, TSK-002]\ntagsless: \n```\n")).toBe(true);
    const split = splitMetadataBlock(issueBody, 7);
    expect(split.body).toBe(body);
    expect(split.metadata).toEqual({ created: "2026-11-07", source: "manual", "depends-on": ["TSK-001", "TSK-002"], tagsless: "" });
  });

  it("round-trips an empty body and empty metadata", () => {
    const issueBody = joinMetadataBlock({}, "");
    expect(issueBody).toBe("```flowstate\n```\n");
    expect(splitMetadataBlock(issueBody, 1)).toEqual({ metadata: {}, body: "" });
  });

  it("reads a body without a block as empty metadata (an issue created by hand)", () => {
    expect(splitMetadataBlock("Just a description\n", 3)).toEqual({ metadata: {}, body: "Just a description\n" });
    expect(splitMetadataBlock("", 3)).toEqual({ metadata: {}, body: "" });
  });

  it("tolerates blank lines before the block", () => {
    const split = splitMetadataBlock("\n\n```flowstate\ncreated: 2026-01-01\n```\nbody", 4);
    expect(split.metadata).toEqual({ created: "2026-01-01" });
    expect(split.body).toBe("body");
  });

  it("fails loudly on an unclosed block, naming the issue", () => {
    expect(() => splitMetadataBlock("```flowstate\ncreated: 2026-01-01\n\n# Title", 12)).toThrow(MetadataBlockError);
    expect(() => splitMetadataBlock("```flowstate\ncreated: 2026-01-01\n", 12)).toThrow(/Issue #12 .*no closing/);
  });

  it("fails loudly on a line that is not key: value", () => {
    expect(() => splitMetadataBlock("```flowstate\ncreated 2026-01-01\n```\n", 5)).toThrow(/Issue #5 .*"created 2026-01-01" is not "key: value"/);
  });

  it("ignores a flowstate fence that is not at the top", () => {
    const split = splitMetadataBlock("# Title\n\n```flowstate\ncreated: x\n```\n", 2);
    expect(split.metadata).toEqual({});
    expect(split.body).toContain("```flowstate");
  });
});
