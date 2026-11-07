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
// Edit is blocked on the config file by its implicit zone, so the message
// tells the reader to repair it by hand.
export class ReadOnlyZonesConfigError extends Error {
    constructor(configPath, detail) {
        super(`read-only-zones: ${configPath} is broken: ${detail}. ` +
            "All edits in this project are blocked until it is fixed. " +
            "Fix the file by hand (the agent cannot edit it): it must be a JSON array of " +
            '{ "glob": "<pattern>", "why": "<reason>" } entries.');
        this.name = "ReadOnlyZonesConfigError";
    }
}
export class TestCommandError extends Error {
    constructor(message) {
        super(message);
        this.name = "TestCommandError";
    }
}
