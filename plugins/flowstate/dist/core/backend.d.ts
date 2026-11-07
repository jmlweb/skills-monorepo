import { type GhRunner } from "./gh.js";
import type { BacklogStore } from "./store.js";
export declare const BACKEND_ENV = "FLOWSTATE_BACKEND";
export declare const GITHUB_REPO_ENV = "FLOWSTATE_GITHUB_REPO";
export type Backend = "file" | "github";
export interface ResolvedStore {
    readonly backend: Backend;
    readonly store: BacklogStore;
    readonly repo?: string;
}
type Env = Readonly<Record<string, string | undefined>>;
export declare function backendOf(env?: Env): Backend;
export declare function validateRepo(value: string): string;
export declare function resolveRepo(gh: GhRunner, env?: Env): Promise<string>;
export declare function resolveStore(root: string, cwd: string, env?: Env, gh?: GhRunner): Promise<ResolvedStore>;
export {};
