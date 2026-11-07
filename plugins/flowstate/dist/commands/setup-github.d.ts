import type { GhRunner } from "../core/gh.js";
export interface SetupGithubInput {
    readonly repo: string;
    readonly projectName: string;
}
export interface SetupGithubResult {
    readonly root: string;
    readonly repo: string;
    readonly labels: readonly string[];
}
export declare function setupGithub(root: string, input: SetupGithubInput, gh: GhRunner): Promise<SetupGithubResult>;
