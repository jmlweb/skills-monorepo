import { describe, expect, it } from "vitest";
import { markdownToAdf } from "./md-to-adf.js";
import { MarkdownConversionError } from "./errors.js";

function ids(): () => string {
  let n = 0;
  return () => `id-${++n}`;
}

const convert = (md: string) => markdownToAdf(md, { newId: ids() }).content;

describe("markdownToAdf", () => {
  it("wraps content in a versioned doc", () => {
    expect(markdownToAdf("hi")).toEqual({
      type: "doc",
      version: 1,
      content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }],
    });
  });

  it("rejects empty input instead of returning an empty doc", () => {
    expect(() => markdownToAdf("  \n\n")).toThrow(MarkdownConversionError);
  });

  it("converts headings and joins soft-wrapped paragraph lines", () => {
    expect(convert("## Problem\n\nfirst line\nsecond line")).toEqual([
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Problem" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "first line second line" }],
      },
    ]);
  });

  it("applies code, strong, em, strike and link marks", () => {
    const [p] = convert(
      "a `x` **b** *c* ~~d~~ [e](https://x.test/1) https://y.test/2.",
    );
    expect(p?.content).toEqual([
      { type: "text", text: "a " },
      { type: "text", text: "x", marks: [{ type: "code" }] },
      { type: "text", text: " " },
      { type: "text", text: "b", marks: [{ type: "strong" }] },
      { type: "text", text: " " },
      { type: "text", text: "c", marks: [{ type: "em" }] },
      { type: "text", text: " " },
      { type: "text", text: "d", marks: [{ type: "strike" }] },
      { type: "text", text: " " },
      {
        type: "text",
        text: "e",
        marks: [{ type: "link", attrs: { href: "https://x.test/1" } }],
      },
      { type: "text", text: " " },
      {
        type: "text",
        text: "https://y.test/2",
        marks: [{ type: "link", attrs: { href: "https://y.test/2" } }],
      },
      { type: "text", text: "." },
    ]);
  });

  it("keeps only the link mark inside code (ADF forbids code + strong)", () => {
    const [p] = convert("**`x`**");
    expect(p?.content).toEqual([
      { type: "text", text: "x", marks: [{ type: "code" }] },
    ]);
  });

  it("leaves snake_case and escaped characters alone", () => {
    const [p] = convert("my_var_name and \\*not em\\*");
    expect(p?.content).toEqual([
      { type: "text", text: "my_var_name and *not em*" },
    ]);
  });

  it("converts bullet, ordered and nested lists", () => {
    expect(convert("- a\n  - a1\n- b\n\n3. x\n4. y")).toEqual([
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "a" }] },
              {
                type: "bulletList",
                content: [
                  {
                    type: "listItem",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "a1" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "b" }] },
            ],
          },
        ],
      },
      {
        type: "orderedList",
        attrs: { order: 3 },
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "x" }] },
            ],
          },
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "y" }] },
            ],
          },
        ],
      },
    ]);
  });

  it("converts checklist items to a taskList with fresh localIds", () => {
    expect(
      convert("- [ ] Opens on Chrome 116\n- [x] No new `Promise.withResolvers` events"),
    ).toEqual([
      {
        type: "taskList",
        attrs: { localId: "id-3" },
        content: [
          {
            type: "taskItem",
            attrs: { localId: "id-1", state: "TODO" },
            content: [{ type: "text", text: "Opens on Chrome 116" }],
          },
          {
            type: "taskItem",
            attrs: { localId: "id-2", state: "DONE" },
            content: [
              { type: "text", text: "No new " },
              {
                type: "text",
                text: "Promise.withResolvers",
                marks: [{ type: "code" }],
              },
              { type: "text", text: " events" },
            ],
          },
        ],
      },
    ]);
  });

  it("generates distinct UUIDs by default", () => {
    const [list] = markdownToAdf("- [ ] a\n- [ ] b").content;
    const item = list?.content?.[0];
    expect(list?.attrs?.["localId"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(item?.attrs?.["localId"]).not.toBe(list?.attrs?.["localId"]);
  });

  it("refuses nested content under a checklist item rather than dropping it", () => {
    expect(() => convert("- [ ] a\n  - sub")).toThrow(/line 1/);
  });

  it("converts a table with header row, links, code and escaped pipes", () => {
    expect(
      convert(
        "| Field | Value |\n| --- | --- |\n| Sentry | [W-8ED](https://s.test/1) |\n| Release | `app@8.1` |\n| Pipe | a \\| b |",
      ),
    ).toEqual([
      {
        type: "table",
        attrs: { isNumberColumnEnabled: false, layout: "default" },
        content: [
          row("tableHeader", [[t("Field")], [t("Value")]]),
          row("tableCell", [
            [t("Sentry")],
            [
              {
                type: "text",
                text: "W-8ED",
                marks: [{ type: "link", attrs: { href: "https://s.test/1" } }],
              },
            ],
          ]),
          row("tableCell", [
            [t("Release")],
            [{ type: "text", text: "app@8.1", marks: [{ type: "code" }] }],
          ]),
          row("tableCell", [[t("Pipe")], [t("a | b")]]),
        ],
      },
    ]);
  });

  it("converts fenced code, blockquotes and rules", () => {
    expect(convert("```ts\nconst a = 1;\n```\n\n> note\n\n---")).toEqual([
      {
        type: "codeBlock",
        attrs: { language: "ts" },
        content: [{ type: "text", text: "const a = 1;" }],
      },
      {
        type: "blockquote",
        content: [{ type: "paragraph", content: [t("note")] }],
      },
      { type: "rule" },
    ]);
  });

  it("throws on an unclosed code fence with the opening line number", () => {
    expect(() => convert("a\n\n```\nnever closed")).toThrow(/line 3/);
  });
});

function t(value: string) {
  return { type: "text", text: value };
}

function row(kind: string, cells: readonly (readonly object[])[]) {
  return {
    type: "tableRow",
    content: cells.map((inline) => ({
      type: kind,
      attrs: {},
      content: [{ type: "paragraph", content: inline }],
    })),
  };
}
