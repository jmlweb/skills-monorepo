import { describe, expect, it } from "vitest";
import { readbackToMarkdown } from "./readback.js";
import { InvalidArgumentError } from "./errors.js";

const md = [
  'Blocked by <custom data-type="smartlink" data-id="id-0">https://acme.atlassian.net/browse/PROJ-12</custom>.',
  'See <custom data-type="smartlink" data-id="id-1">https://example.test/doc</custom>',
  '* <custom data-type="mention" data-id="id-2">@Ana López</custom>',
  '* <custom data-type="mention" data-id="id-3">@bo</custom>',
].join("\n");
const html =
  '<a class="user-hover" data-account-id="712020:a" accountid="712020:a">Ana</a>' +
  '<a class="user-hover" data-account-id="42" accountid="42">bo</a>';

describe("readbackToMarkdown", () => {
  it("restores keys, URLs and mentions in order", () => {
    expect(readbackToMarkdown(md, html)).toBe(
      [
        "Blocked by PROJ-12.",
        "See https://example.test/doc",
        "* [@Ana López](mention:712020:a)",
        "* [@bo](mention:42)",
      ].join("\n"),
    );
  });

  it("refuses when mention and account counts differ", () => {
    expect(() => readbackToMarkdown(md, "")).toThrow(InvalidArgumentError);
  });

  it("refuses unknown custom nodes instead of dropping them", () => {
    expect(() =>
      readbackToMarkdown('<custom data-type="status" data-id="id-0">DONE</custom>', ""),
    ).toThrow(/unsupported <custom> node\(s\): status/);
  });

  it("leaves plain Markdown untouched", () => {
    expect(readbackToMarkdown("## Goal\n\nPROJ-1", "")).toBe("## Goal\n\nPROJ-1");
  });
});
