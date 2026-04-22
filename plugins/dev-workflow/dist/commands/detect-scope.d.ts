export type ScopeSource = "files" | "branch" | "none";
export type DetectScopeResult = {
    scopes: string[];
    suggested: string | null;
    source: ScopeSource;
};
export type PackageNameReader = (workspaceDir: string, dirName: string) => string | null;
export declare function detectScopeFromFiles(files: readonly string[], readPackageName: PackageNameReader): string[];
export declare function detectScopeFromBranch(branch: string): string | null;
export declare function detectScope(files: readonly string[], branch: string, readPackageName: PackageNameReader): DetectScopeResult;
export declare function readPackageNameFromDisk(cwd: string, workspaceDir: string, dirName: string): string | null;
