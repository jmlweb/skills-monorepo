import type { PackageInfo } from "../core/packages.js";
export type DetectedPackage = {
    name: string;
    shortName: string;
    private: boolean;
    dir: string;
};
export type PackageReader = (relativeDir: string) => PackageInfo | null;
export type DetectPackagesOptions = {
    includePrivate?: boolean;
};
export declare function detectPackages(files: readonly string[], readPackage: PackageReader, options?: DetectPackagesOptions): DetectedPackage[];
