export class MarkdownConversionError extends Error {
    line;
    constructor(message, line) {
        super(`line ${line}: ${message}`);
        this.line = line;
        this.name = "MarkdownConversionError";
    }
}
export class InvalidArgumentError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidArgumentError";
    }
}
