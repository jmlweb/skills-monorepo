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
export class GhMissingError extends Error {
    constructor() {
        super("The GitHub backend needs the gh CLI on PATH (https://cli.github.com). Install it, or unset FLOWSTATE_BACKEND to use the .backlog/ files.");
        this.name = "GhMissingError";
    }
}
export class GhAuthError extends Error {
    constructor(detail) {
        super(`gh is not authenticated: ${detail.trim() || "no GitHub host is logged in"}. Run "gh auth login", then retry.`);
        this.name = "GhAuthError";
    }
}
export class GhRepoError extends Error {
    constructor(repo, detail) {
        super(`GitHub repository "${repo}" is not reachable: ${detail.trim() || "unknown error"}. Check FLOWSTATE_GITHUB_REPO (owner/name) or run the command inside a checkout with a GitHub remote.`);
        this.name = "GhRepoError";
    }
}
// Any other gh failure (network, rate limit, unexpected output). The message carries the gh stderr.
export class GhCommandError extends Error {
    constructor(args, detail) {
        super(`gh ${args.join(" ")} failed: ${detail.trim() || "no output"}`);
        this.name = "GhCommandError";
    }
}
// An issue the lookup reached but that is not the entity asked for: a pull request, or an
// issue carrying another flowstate type label (or none).
export class GhIssueTypeError extends Error {
    issueNumber;
    constructor(issueNumber, detail) {
        super(`Issue #${issueNumber} is not usable here: ${detail}`);
        this.issueNumber = issueNumber;
        this.name = "GhIssueTypeError";
    }
}
// A closed idea or report must carry exactly one final-state label; anything else is
// rejected rather than guessed. task-doctor lists these.
export class GhIssueStateError extends Error {
    issueNumber;
    constructor(issueNumber, detail) {
        super(`Issue #${issueNumber} has an invalid flowstate state: ${detail}`);
        this.issueNumber = issueNumber;
        this.name = "GhIssueStateError";
    }
}
export class MetadataBlockError extends Error {
    issueNumber;
    constructor(issueNumber, detail) {
        super(`Issue #${issueNumber} has a malformed flowstate metadata block: ${detail}. Fix the fenced \`\`\`flowstate block at the top of the issue body, then retry.`);
        this.issueNumber = issueNumber;
        this.name = "MetadataBlockError";
    }
}
export class RegistryReadError extends Error {
    constructor(path, cause) {
        const reason = cause instanceof Error ? cause.message : String(cause);
        super(`Cannot read the shared backlog registry "${path}": ${reason}. Fix its permissions, or set FLOWSTATE_SHARED=off to skip shared learnings.`);
        this.name = "RegistryReadError";
    }
}
