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

const WORKSPACE_DIRS = ["apps", "packages", "plugins"] as const;

export function detectPackages(
  files: readonly string[],
  readPackage: PackageReader,
  options: DetectPackagesOptions = {},
): DetectedPackage[] {
  const includePrivate = options.includePrivate ?? false;
  const seen = new Map<string, DetectedPackage>();

  for (const file of files) {
    const parts = file.split("/");
    if (parts.length < 2) continue;
    const top = parts[0];
    const name = parts[1];
    if (!top || !name) continue;
    if (!(WORKSPACE_DIRS as readonly string[]).includes(top)) continue;

    const relDir = `${top}/${name}`;
    if (seen.has(relDir)) continue;

    const info = readPackage(relDir);
    if (!info) continue;

    if (!includePrivate && info.private) continue;

    seen.set(relDir, {
      name: info.name,
      shortName: info.shortName,
      private: info.private,
      dir: info.dir,
    });
  }

  return [...seen.values()];
}
