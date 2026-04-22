export type PackageInfo = {
    name: string;
    shortName: string;
    private: boolean;
    dir: string;
};
export declare function readPackageInfo(cwd: string, relativeDir: string): PackageInfo | null;
