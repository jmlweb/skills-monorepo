export declare class GitError extends Error {
    constructor(message: string);
}
export declare class TemplateLookupError extends Error {
    constructor(message: string);
}
export declare class InvalidArgumentError extends Error {
    constructor(message: string);
}
export declare class ReadOnlyZonesConfigError extends Error {
    constructor(configPath: string, detail: string);
}
export declare class TestCommandError extends Error {
    constructor(message: string);
}
