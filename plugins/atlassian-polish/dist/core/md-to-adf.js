import { randomUUID } from "node:crypto";
import { MarkdownConversionError } from "./errors.js";
const ITEM_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TASK_RE = /^\[( |x|X)\]\s+(.*)$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const FENCE_RE = /^\s*```\s*([\w+-]*)\s*$/;
const RULE_RE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
export function markdownToAdf(markdown, options = {}) {
    const ctx = { newId: options.newId ?? randomUUID };
    const lines = markdown
        .replace(/\r\n?/g, "\n")
        .replace(/\t/g, "    ")
        .split("\n")
        .map((text, i) => ({ text, no: i + 1 }));
    const content = parseBlocks(lines, ctx);
    if (content.length === 0) {
        throw new MarkdownConversionError("input has no content", 1);
    }
    return { type: "doc", version: 1, content };
}
function isBlank(line) {
    return line.text.trim() === "";
}
function indentOf(text) {
    return text.length - text.trimStart().length;
}
function isTableStart(lines, i) {
    const head = lines[i];
    const sep = lines[i + 1];
    return (head !== undefined &&
        sep !== undefined &&
        head.text.trim().startsWith("|") &&
        TABLE_SEP_RE.test(sep.text));
}
function startsBlock(lines, i) {
    const text = lines[i].text;
    return (HEADING_RE.test(text.trim()) ||
        FENCE_RE.test(text) ||
        RULE_RE.test(text) ||
        ITEM_RE.test(text) ||
        text.trimStart().startsWith(">") ||
        isTableStart(lines, i));
}
function parseBlocks(lines, ctx) {
    const out = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (isBlank(line)) {
            i++;
            continue;
        }
        const fence = FENCE_RE.exec(line.text);
        if (fence) {
            let j = i + 1;
            const body = [];
            while (j < lines.length && !/^\s*```\s*$/.test(lines[j].text)) {
                body.push(lines[j].text);
                j++;
            }
            if (j >= lines.length) {
                throw new MarkdownConversionError("unclosed code fence", line.no);
            }
            const code = body.join("\n");
            out.push({
                type: "codeBlock",
                ...(fence[1] ? { attrs: { language: fence[1] } } : {}),
                ...(code ? { content: [{ type: "text", text: code }] } : {}),
            });
            i = j + 1;
            continue;
        }
        const heading = HEADING_RE.exec(line.text.trim());
        if (heading) {
            const text = heading[2].replace(/\s+#+\s*$/, "").trim();
            out.push({
                type: "heading",
                attrs: { level: heading[1].length },
                content: parseInline(text, []),
            });
            i++;
            continue;
        }
        if (RULE_RE.test(line.text)) {
            out.push({ type: "rule" });
            i++;
            continue;
        }
        if (isTableStart(lines, i)) {
            const { node, next } = parseTable(lines, i);
            out.push(node);
            i = next;
            continue;
        }
        if (line.text.trimStart().startsWith(">")) {
            const quoted = [];
            while (i < lines.length &&
                !isBlank(lines[i]) &&
                lines[i].text.trimStart().startsWith(">")) {
                const l = lines[i];
                quoted.push({
                    text: l.text.trimStart().replace(/^>\s?/, ""),
                    no: l.no,
                });
                i++;
            }
            out.push({ type: "blockquote", content: parseBlocks(quoted, ctx) });
            continue;
        }
        if (ITEM_RE.test(line.text)) {
            const { node, next } = parseList(lines, i, indentOf(line.text), ctx);
            out.push(node);
            i = next;
            continue;
        }
        const para = [];
        while (i < lines.length && !isBlank(lines[i])) {
            if (para.length > 0 && startsBlock(lines, i))
                break;
            para.push(lines[i].text.trim());
            i++;
        }
        out.push({ type: "paragraph", content: parseInline(para.join(" "), []) });
    }
    return out;
}
function itemKind(text) {
    const m = ITEM_RE.exec(text);
    if (/^\d/.test(m[2]))
        return "ordered";
    return TASK_RE.test(m[3]) ? "task" : "bullet";
}
function parseList(lines, start, base, ctx) {
    const kind = itemKind(lines[start].text);
    const firstNumber = /^\d+/.exec(ITEM_RE.exec(lines[start].text)[2]);
    const items = [];
    let i = start;
    while (i < lines.length) {
        const line = lines[i];
        const m = ITEM_RE.exec(line.text);
        if (!m || indentOf(line.text) !== base || itemKind(line.text) !== kind) {
            break;
        }
        let body = m[3];
        let state;
        if (kind === "task") {
            const t = TASK_RE.exec(body);
            state = t[1] === " " ? "TODO" : "DONE";
            body = t[2];
        }
        i++;
        const nested = [];
        const continuation = [body.trim()];
        for (;;) {
            const next = lines[i];
            if (next === undefined)
                break;
            if (isBlank(next)) {
                // A blank line only continues the list when another item follows.
                let k = i;
                while (k < lines.length && isBlank(lines[k]))
                    k++;
                const after = lines[k];
                if (after !== undefined &&
                    ITEM_RE.test(after.text) &&
                    indentOf(after.text) >= base) {
                    i = k;
                }
                break;
            }
            const indent = indentOf(next.text);
            if (indent > base && ITEM_RE.test(next.text)) {
                const sub = parseList(lines, i, indent, ctx);
                nested.push(sub.node);
                i = sub.next;
                continue;
            }
            if (indent > base && nested.length === 0) {
                continuation.push(next.text.trim());
                i++;
                continue;
            }
            break;
        }
        const inline = parseInline(continuation.join(" "), []);
        if (kind === "task") {
            if (nested.length > 0) {
                throw new MarkdownConversionError("nested content under a checklist item is not supported", line.no);
            }
            items.push({
                type: "taskItem",
                attrs: { localId: ctx.newId(), state },
                content: inline,
            });
        }
        else {
            items.push({
                type: "listItem",
                content: [{ type: "paragraph", content: inline }, ...nested],
            });
        }
    }
    if (kind === "task") {
        return {
            node: {
                type: "taskList",
                attrs: { localId: ctx.newId() },
                content: items,
            },
            next: i,
        };
    }
    if (kind === "ordered") {
        const order = firstNumber ? Number(firstNumber[0]) : 1;
        return {
            node: {
                type: "orderedList",
                ...(order !== 1 ? { attrs: { order } } : {}),
                content: items,
            },
            next: i,
        };
    }
    return { node: { type: "bulletList", content: items }, next: i };
}
function splitRow(text) {
    let s = text.trim();
    if (s.startsWith("|"))
        s = s.slice(1);
    if (s.endsWith("|") && !s.endsWith("\\|"))
        s = s.slice(0, -1);
    const cells = [];
    let cur = "";
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === "\\" && s[i + 1] === "|") {
            cur += "|";
            i++;
        }
        else if (c === "|") {
            cells.push(cur.trim());
            cur = "";
        }
        else {
            cur += c;
        }
    }
    cells.push(cur.trim());
    return cells;
}
function parseTable(lines, start) {
    const header = splitRow(lines[start].text);
    const rows = [];
    let i = start + 2;
    while (i < lines.length &&
        !isBlank(lines[i]) &&
        lines[i].text.includes("|")) {
        rows.push(splitRow(lines[i].text));
        i++;
    }
    const width = header.length;
    const toRow = (cells, kind) => ({
        type: "tableRow",
        content: Array.from({ length: width }, (_, c) => {
            const inline = parseInline(cells[c] ?? "", []);
            return {
                type: kind,
                attrs: {},
                content: [
                    {
                        type: "paragraph",
                        ...(inline.length > 0 ? { content: inline } : {}),
                    },
                ],
            };
        }),
    });
    return {
        node: {
            type: "table",
            attrs: { isNumberColumnEnabled: false, layout: "default" },
            content: [
                toRow(header, "tableHeader"),
                ...rows.map((r) => toRow(r, "tableCell")),
            ],
        },
        next: i,
    };
}
function text(value, marks) {
    return marks.length > 0
        ? { type: "text", text: value, marks }
        : { type: "text", text: value };
}
const isAlnum = (c) => c !== undefined && /[A-Za-z0-9]/.test(c);
/**
 * ADF forbids `code` combined with strong/em/strike; only `link` may share a
 * node with it, so other marks are dropped inside code spans.
 */
function codeMarks(marks) {
    return [...marks.filter((m) => m.type === "link"), { type: "code" }];
}
function parseInline(src, marks) {
    const out = [];
    let buf = "";
    const flush = () => {
        if (buf)
            out.push(text(buf, marks));
        buf = "";
    };
    const hasLink = marks.some((m) => m.type === "link");
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        if (c === "\\" && i + 1 < src.length && /[\\`*_{}[\]()#+\-.!|~>]/.test(src[i + 1])) {
            buf += src[i + 1];
            i += 2;
            continue;
        }
        if (c === "`") {
            const end = src.indexOf("`", i + 1);
            if (end > i + 1) {
                flush();
                out.push(text(src.slice(i + 1, end), codeMarks(marks)));
                i = end + 1;
                continue;
            }
        }
        const two = src.slice(i, i + 2);
        if (two === "**" || two === "__" || two === "~~") {
            const end = src.indexOf(two, i + 2);
            if (end > i + 2 && !/\s/.test(src[i + 2])) {
                flush();
                const mark = { type: two === "~~" ? "strike" : "strong" };
                out.push(...parseInline(src.slice(i + 2, end), [...marks, mark]));
                i = end + 2;
                continue;
            }
        }
        if ((c === "*" || c === "_") && src[i + 1] !== c && !/\s/.test(src[i + 1] ?? " ")) {
            if (c === "*" || !isAlnum(src[i - 1])) {
                let end = -1;
                for (let j = i + 2; j < src.length; j++) {
                    if (src[j] !== c || src[j + 1] === c || src[j - 1] === c)
                        continue;
                    if (/\s/.test(src[j - 1]))
                        continue;
                    if (c === "_" && isAlnum(src[j + 1]))
                        continue;
                    end = j;
                    break;
                }
                if (end > i + 1) {
                    flush();
                    out.push(...parseInline(src.slice(i + 1, end), [...marks, { type: "em" }]));
                    i = end + 1;
                    continue;
                }
            }
        }
        if (c === "[" && !hasLink) {
            const m = /^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(src.slice(i));
            if (m?.[2].startsWith("mention:")) {
                // [@Name](mention:<accountId>) → real ADF mention; plain text can't notify.
                flush();
                const name = m[1].replace(/^@/, "");
                out.push({
                    type: "mention",
                    attrs: { id: m[2].slice("mention:".length), text: `@${name}` },
                });
                i += m[0].length;
                continue;
            }
            if (m) {
                flush();
                out.push(...parseInline(m[1], [
                    ...marks,
                    { type: "link", attrs: { href: m[2] } },
                ]));
                i += m[0].length;
                continue;
            }
        }
        if (c === "h" && !hasLink && !isAlnum(src[i - 1])) {
            const m = /^https?:\/\/[^\s<>]+/.exec(src.slice(i));
            if (m) {
                const url = m[0].replace(/[.,;:!?)]+$/, "");
                flush();
                out.push(text(url, [...marks, { type: "link", attrs: { href: url } }]));
                i += url.length;
                continue;
            }
        }
        buf += c;
        i++;
    }
    flush();
    return out;
}
