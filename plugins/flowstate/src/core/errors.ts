export class BacklogNotFoundError extends Error {
  constructor(root: string) {
    super(
      `No .backlog/ directory found in ${root} or any parent directory. Run "flowstate setup" to create one.`,
    );
    this.name = "BacklogNotFoundError";
  }
}

export class EntityNotFoundError extends Error {
  constructor(id: string, searched: string) {
    super(`Entity "${id}" not found in ${searched}`);
    this.name = "EntityNotFoundError";
  }
}

export class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidArgumentError";
  }
}

export class SectionNotFoundError extends Error {
  constructor(id: string, heading: string) {
    super(
      `${id} has no "## ${heading}" section. Restore the heading in the task file, then retry.`,
    );
    this.name = "SectionNotFoundError";
  }
}
