export declare class BacklogNotFoundError extends Error {
    constructor(root: string);
}
export declare class BacklogDirMissingError extends Error {
    constructor(dir: string);
}
export declare class EntityNotFoundError extends Error {
    constructor(id: string, searched: string);
}
export declare class InvalidArgumentError extends Error {
    constructor(message: string);
}
export declare class SectionNotFoundError extends Error {
    constructor(id: string, heading: string);
}
export declare class GhMissingError extends Error {
    constructor();
}
export declare class GhAuthError extends Error {
    constructor(detail: string);
}
export declare class GhRepoError extends Error {
    constructor(repo: string, detail: string);
}
export declare class GhCommandError extends Error {
    constructor(args: readonly string[], detail: string);
}
export declare class GhIssueTypeError extends Error {
    readonly issueNumber: number;
    constructor(issueNumber: number, detail: string);
}
export declare class GhIssueStateError extends Error {
    readonly issueNumber: number;
    constructor(issueNumber: number, detail: string);
}
export declare class MetadataBlockError extends Error {
    readonly issueNumber: number;
    constructor(issueNumber: number, detail: string);
}
export declare class RegistryReadError extends Error {
    constructor(path: string, cause: unknown);
}
