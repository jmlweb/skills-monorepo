/**
 * The Jira MCP reads smart links and mentions back as `<custom>` tags, which a Markdown
 * write would flatten. Turn them into the syntax md-to-adf re-creates: bare issue keys and
 * `[@Name](mention:<accountId>)`. Account IDs come from the rendered HTML, in order, since
 * the tag's data-id is only a per-response counter.
 */
export declare function readbackToMarkdown(markdown: string, renderedHtml: string): string;
