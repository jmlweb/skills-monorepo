export type TemplateSource = "repo" | "user" | "builtin";
export interface FindPrTemplateInput {
    readonly cwd: string;
    /** Directory that may hold `pr-template.md`. Missing or empty means no user template. */
    readonly userDir?: string;
    /** Override for tests; defaults to the plugin's bundled template. */
    readonly builtinPath?: string;
}
export interface FindPrTemplateResult {
    readonly source: TemplateSource;
    /** Null when several repo templates match and the caller must ask which. */
    readonly path: string | null;
    readonly candidates: readonly string[];
}
export declare function findPrTemplate(input: FindPrTemplateInput): FindPrTemplateResult;
