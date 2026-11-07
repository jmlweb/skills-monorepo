import { InvalidArgumentError } from "./errors.js";

export interface ParsedArgs {
  readonly flags: Record<string, string>;
  // Every value a repeated flag received, in order (task-update --set a=1 --set b=2).
  readonly flagArrays: Record<string, string[]>;
  readonly positional: string[];
}

// `switches` may appear without a value and then read as "true". Every other flag needs
// one: an empty string is kept literally, and a token starting with "--" is the next
// flag, never a value, so the command fails instead of storing "true" (RPT-014).
export function parseArgs(args: readonly string[], switches: ReadonlySet<string>): ParsedArgs {
  const flags: Record<string, string> = {};
  const flagArrays: Record<string, string[]> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = args[i + 1];
    let value: string;
    if (next !== undefined && !next.startsWith("--")) {
      value = next;
      i++;
    } else if (switches.has(key)) {
      value = "true";
    } else {
      throw new InvalidArgumentError(missingValueMessage(key, next));
    }
    flags[key] = value;
    (flagArrays[key] ??= []).push(value);
  }

  return { flags, flagArrays, positional };
}

function missingValueMessage(key: string, next: string | undefined): string {
  return next === undefined
    ? `Flag --${key} needs a value.`
    : `Flag --${key} needs a value, but "${next}" reads as the next flag. Values cannot start with --.`;
}
