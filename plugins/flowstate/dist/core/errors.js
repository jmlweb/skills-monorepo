export class BacklogNotFoundError extends Error {
    constructor(root) {
        super(`No .backlog/ directory found in ${root} or any parent directory, and FLOWSTATE_BACKLOG_DIR is not set. Run "flowstate setup" to create one (or "flowstate setup --dir <path>" for a private backlog).`);
        this.name = "BacklogNotFoundError";
    }
}
export class BacklogDirMissingError extends Error {
    constructor(dir) {
        super(`FLOWSTATE_BACKLOG_DIR points to "${dir}", which does not exist. Run "flowstate setup --dir ${dir}" to create it, or fix/unset the variable.`);
        this.name = "BacklogDirMissingError";
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
export class SectionNotFoundError extends Error {
    constructor(id, heading) {
        super(`${id} has no "## ${heading}" section. Restore the heading in the task file, then retry.`);
        this.name = "SectionNotFoundError";
    }
}
