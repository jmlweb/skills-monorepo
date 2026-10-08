export interface LossyFinding {
    readonly kind: string;
    readonly source: "markdown" | "html" | "adf";
    readonly count: number;
    /** Set when a documented step re-creates the node, so a rewrite does not lose it. */
    readonly handledBy?: "readback-to-md";
}
export interface LossyScanInput {
    readonly markdown?: string;
    readonly html?: string;
    readonly adf?: string;
}
/** Everything in a Jira body that a Markdown rewrite could drop or flatten. */
export declare function scanLossy(input: LossyScanInput): readonly LossyFinding[];
/** Findings that need `LOSSY:` in the preview and a preserve-or-approve decision. */
export declare const blocking: (findings: readonly LossyFinding[]) => readonly LossyFinding[];
