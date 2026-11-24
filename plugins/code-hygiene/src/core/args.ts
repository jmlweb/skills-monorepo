import { InvalidArgumentError } from "./errors.js";

// `switches` may appear without a value and then read as "true". Every other flag needs
// one: an empty string is kept literally, and a token starting with "--" is the next
// flag, never a value, so the command fails instead of storing "true" (RPT-014).
export function parseFlags(
  args: readonly string[],
  switches: ReadonlySet<string>,
): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[key] = next;
      i++;
    } else if (switches.has(key)) {
      flags[key] = "true";
    } else {
      throw new InvalidArgumentError(
        next === undefined
          ? `Flag --${key} needs a value.`
          : `Flag --${key} needs a value, but "${next}" reads as the next flag. Values cannot start with --.`,
      );
    }
  }
  return flags;
}
