export declare const ZONES_CONFIG_PATH = ".claude/read-only-zones.json";
export type Zone = {
    readonly glob: string;
    readonly why: string;
};
export type ZoneCheck = {
    readonly blocked: true;
    readonly relativePath: string;
    readonly zone: Zone;
} | {
    readonly blocked: false;
    readonly reason: "no-root" | "outside-project" | "no-match";
};
export type HookOutcome = {
    readonly exitCode: 0 | 2;
    readonly message: string | null;
};
export declare function globToRegExp(glob: string): RegExp;
export declare function parseZonesConfig(raw: string, configPath: string): readonly Zone[];
export declare function loadZonesConfig(projectDir: string): readonly Zone[] | null;
export declare function findGitRoot(startDir: string): string | null;
export declare function checkTarget(input: {
    readonly projectDir: string;
    readonly zones: readonly Zone[];
    readonly targetPath: string;
}): ZoneCheck;
export declare function runReadOnlyZonesHook(input: {
    readonly projectDir: string | undefined;
    readonly readStdin: () => Promise<string>;
}): Promise<HookOutcome>;
