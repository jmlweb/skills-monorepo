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

// A misspelt flag that carries a value would otherwise be stored and never read, so the
// command would report success while dropping the change (RPT-030).
export function rejectUnknownFlags(
  command: string,
  flags: Readonly<Record<string, string>>,
  accepted: ReadonlySet<string>,
): void {
  const unknown = Object.keys(flags).filter((key) => !accepted.has(key));
  if (unknown.length === 0) return;
  const label = unknown.length === 1 ? "flag" : "flags";
  const acceptedList = [...accepted].map((key) => `--${key}`).join(", ");
  throw new InvalidArgumentError(
    `Unknown ${label} for ${command}: ${unknown.map((key) => `--${key}`).join(", ")}. Accepted flags: ${acceptedList}.`,
  );
}

function missingValueMessage(key: string, next: string | undefined): string {
  return next === undefined
    ? `Flag --${key} needs a value.`
    : `Flag --${key} needs a value, but "${next}" reads as the next flag. Values cannot start with --.`;
}
