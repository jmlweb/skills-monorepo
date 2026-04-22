export class BacklogNotFoundError extends Error {
    constructor(cwd) {
        super(`No .backlog/ directory found in ${cwd} or any parent directory. Run "flowstate setup" to create one.`);
        this.name = "BacklogNotFoundError";
    }
}
export class EntityNotFoundError extends Error {
    constructor(id, searched) {
        super(`Entity "${id}" not found in ${searched}`);
        this.name = "EntityNotFoundError";
    }
}
export class InvalidArgumentError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidArgumentError";
    }
}
