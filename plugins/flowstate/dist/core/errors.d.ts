export declare class BacklogNotFoundError extends Error {
    constructor(cwd: string);
}
export declare class EntityNotFoundError extends Error {
    constructor(id: string, searched: string);
}
export declare class InvalidArgumentError extends Error {
    constructor(message: string);
}
