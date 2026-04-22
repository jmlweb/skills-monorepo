export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitError";
  }
}

export class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidArgumentError";
  }
}
