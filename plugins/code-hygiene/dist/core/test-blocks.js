// Matches the call heads of it/test and their variants. The lookbehind keeps
// method calls such as `harness.test(` out of the results.
const TEST_CALL = /(?<![\w$.])(it|test|xit|xtest|specify)(?:\.(only|skip|todo|each))?\s*(?=[(`])/g;
const QUOTES = new Set(["'", '"', "`"]);
// Skips string literals, regex literals and comments so brackets and quotes
// inside them do not confuse the matcher. Template literal interpolation is
// not parsed; it is rare in titles.
export function findClosing(source, openIndex, open, close) {
    let depth = 0;
    let i = openIndex;
    while (i < source.length) {
        const ch = source[i];
        const next = source[i + 1];
        if (ch === "/" && next === "/") {
            const eol = source.indexOf("\n", i);
            i = eol === -1 ? source.length : eol;
            continue;
        }
        if (ch === "/" && next === "*") {
            const endComment = source.indexOf("*/", i + 2);
            i = endComment === -1 ? source.length : endComment + 2;
            continue;
        }
        if (ch === "/" && startsRegex(source, i)) {
            i = skipRegex(source, i);
            continue;
        }
        if (QUOTES.has(ch)) {
            i = skipString(source, i);
            continue;
        }
        if (ch === open)
            depth++;
        if (ch === close) {
            depth--;
            if (depth === 0)
                return i;
        }
        i++;
    }
    return null;
}
function skipString(source, start) {
    const quote = source[start];
    let i = start + 1;
    while (i < source.length && source[i] !== quote) {
        i += source[i] === "\\" ? 2 : 1;
    }
    return i + 1;
}
// Keywords after which a `/` starts a regex rather than dividing the keyword.
const REGEX_AFTER_KEYWORD = new Set([
    "return", "typeof", "instanceof", "in", "of", "case", "do", "else",
    "void", "delete", "throw", "new", "await", "yield",
]);
// A `/` divides when it follows a value (identifier, number, closing bracket
// or quote); anywhere else it opens a regex literal. `}` counts as a value,
// which misreads a regex at the start of a statement after a block; tests
// rarely do that, and a division misread as a regex is the costlier mistake.
function startsRegex(source, slashIndex) {
    let i = slashIndex - 1;
    while (i >= 0 && /\s/.test(source[i]))
        i--;
    if (i < 0)
        return true;
    const prev = source[i];
    if (/[\w$]/.test(prev)) {
        let start = i;
        while (start > 0 && /[\w$]/.test(source[start - 1]))
            start--;
        return REGEX_AFTER_KEYWORD.has(source.slice(start, i + 1));
    }
    return !/[)\]}'"`]/.test(prev);
}
// Ends at the first unescaped `/` outside a character class. A regex cannot
// span lines, so a newline means the slash was not a regex after all.
function skipRegex(source, start) {
    let i = start + 1;
    let inClass = false;
    while (i < source.length) {
        const ch = source[i];
        if (ch === "\n")
            return i;
        if (ch === "\\") {
            i += 2;
            continue;
        }
        if (ch === "[")
            inClass = true;
        else if (ch === "]")
            inClass = false;
        else if (ch === "/" && !inClass)
            return i + 1;
        i++;
    }
    return i;
}
function readTitle(source, from) {
    const quote = source[from];
    if (quote === undefined || !QUOTES.has(quote))
        return null;
    const end = skipString(source, from);
    return { name: source.slice(from + 1, end - 1), end };
}
function lineOf(source, index) {
    let line = 1;
    for (let i = 0; i < index; i++)
        if (source[i] === "\n")
            line++;
    return line;
}
const NODE_TEST_SKIP = /\bskip\s*:\s*(?!false\b)/;
const NODE_TEST_TODO = /\btodo\s*:\s*(?!false\b)/;
export function extractTestBlocks(source) {
    const blocks = [];
    for (const match of source.matchAll(TEST_CALL)) {
        const [head, base, modifier] = match;
        const headStart = match.index;
        const parameterised = modifier === "each";
        const isExpression = source[headStart + head.length] === "`";
        if (isExpression)
            continue;
        // it.each(table)(title, fn): the title call follows the table call.
        const openParen = parameterised
            ? titleParenAfterTable(source, headStart + head.length)
            : source.indexOf("(", headStart + head.length - 1);
        if (openParen === null || openParen === -1)
            continue;
        const titleStart = openParen + 1 + leadingSpace(source, openParen + 1);
        const title = readTitle(source, titleStart);
        const callEnd = findClosing(source, openParen, "(", ")");
        if (!title || callEnd === null)
            continue;
        const body = parameterised ? null : findBody(source, title.end, callEnd);
        const argsHead = source.slice(title.end, body?.open ?? callEnd);
        blocks.push({
            name: title.name,
            line: lineOf(source, headStart),
            start: headStart,
            end: body?.close ?? callEnd,
            body: body ? source.slice(body.open + 1, body.close) : null,
            skipped: modifier === "skip" || (base ?? "").startsWith("x") || NODE_TEST_SKIP.test(argsHead),
            todo: modifier === "todo" || NODE_TEST_TODO.test(argsHead),
            parameterised,
        });
    }
    return blocks;
}
function titleParenAfterTable(source, tableOpen) {
    const tableOpenParen = source.indexOf("(", tableOpen);
    if (tableOpenParen === -1)
        return null;
    const tableClose = findClosing(source, tableOpenParen, "(", ")");
    if (tableClose === null)
        return null;
    const next = tableClose + 1 + leadingSpace(source, tableClose + 1);
    return source[next] === "(" ? next : null;
}
function leadingSpace(source, from) {
    let i = from;
    while (i < source.length && /\s/.test(source[i]))
        i++;
    return i - from;
}
// The callback body is the first `{` after the arrow or `function` keyword,
// bounded by the call's own closing paren so a later test is never matched.
function findBody(source, from, callEnd) {
    const region = source.slice(from, callEnd);
    const arrow = region.search(/=>|\bfunction\b/);
    if (arrow === -1)
        return null;
    const open = source.indexOf("{", from + arrow);
    if (open === -1 || open > callEnd)
        return null;
    const close = findClosing(source, open, "{", "}");
    if (close === null || close > callEnd)
        return null;
    return { open, close };
}
