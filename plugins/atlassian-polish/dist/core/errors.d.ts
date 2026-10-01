export declare class MarkdownConversionError extends Error {
    readonly line: number;
    constructor(message: string, line: number);
}
export declare class InvalidArgumentError extends Error {
    constructor(message: string);
}
