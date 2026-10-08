import { describe, expect, it } from "vitest";
import { blocking, scanLossy } from "./lossy-scan.js";

describe("scanLossy", () => {
  it("flags inline media in the Markdown", () => {
    const f = scanLossy({ markdown: "a\n\n![](blob:https://media/x?id=1)\n" });
    expect(f).toEqual([{ kind: "media", source: "markdown", count: 1 }]);
  });

  it("treats smartlink tags as safe and mentions as handled", () => {
    const f = scanLossy({
      markdown:
        '<custom data-type="smartlink" data-id="a">x</custom> <custom data-type="mention" data-id="b">@Bo</custom>',
    });
    expect(f).toEqual([
      { kind: "mention", source: "markdown", count: 1, handledBy: "readback-to-md" },
    ]);
    expect(blocking(f)).toEqual([]);
  });

  it("flags unknown custom nodes", () => {
    const f = scanLossy({ markdown: '<custom data-type="status">DONE</custom>' });
    expect(blocking(f)).toEqual([{ kind: "custom:status", source: "markdown", count: 1 }]);
  });

  it("detects panels and macros in the rendered HTML but not issue-key smart links", () => {
    const html =
      '<div class="panel"><p>x</p></div><a class="jira-issue-macro"><span class="aui-lozenge">Done</span></a><span class="status-macro aui-lozenge">WIP</span>';
    const f = scanLossy({ html });
    expect(f.map((x) => [x.kind, x.count])).toEqual([
      ["panel", 1],
      ["macro", 2],
    ]);
  });

  it("walks ADF and flags every node Markdown cannot express", () => {
    const adf = JSON.stringify({
      type: "doc",
      content: [
        { type: "panel", content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }] },
        { type: "paragraph", content: [{ type: "mention" }, { type: "emoji" }] },
        { type: "mediaSingle", content: [{ type: "media" }] },
      ],
    });
    const kinds = blocking(scanLossy({ adf }))
      .map((f) => f.kind)
      .sort();
    expect(kinds).toEqual(["emoji", "media", "mediaSingle", "panel"]);
  });

  it("returns nothing for plain ADF", () => {
    const adf = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }],
    });
    expect(scanLossy({ adf })).toEqual([]);
  });

  it("rejects invalid ADF and empty input", () => {
    expect(() => scanLossy({ adf: "{" })).toThrow("not valid JSON");
    expect(() => scanLossy({})).toThrow("at least one");
  });

  it("unwraps a saved REST issue response and rejects JSON that is not ADF", () => {
    const doc = { type: "doc", content: [{ type: "panel" }] };
    const adf = JSON.stringify({ fields: { description: doc } });
    expect(blocking(scanLossy({ adf })).map((x) => x.kind)).toEqual(["panel"]);
    expect(() => scanLossy({ adf: "{}" })).toThrow("must be an ADF document");
    expect(() => scanLossy({ adf: '{"fields":{"description":null}}' })).toThrow("must be an ADF document");
  });
});
