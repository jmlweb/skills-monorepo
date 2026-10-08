export class GitError extends Error {
    constructor(message) {
        super(message);
        this.name = "GitError";
    }
}
export class TemplateLookupError extends Error {
    constructor(message) {
        super(message);
        this.name = "TemplateLookupError";
    }
}
export class InvalidArgumentError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidArgumentError";
    }
}
