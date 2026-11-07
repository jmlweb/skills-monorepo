import { InvalidArgumentError } from "./errors.js";
// `switches` may appear without a value and then read as "true". Every other flag needs
// one: an empty string is kept literally, and a token starting with "--" is the next
// flag, never a value, so the command fails instead of storing "true" (RPT-014).
export function parseArgs(args, switches) {
    const flags = {};
    const flagArrays = {};
    const positional = [];
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (!arg.startsWith("--")) {
            positional.push(arg);
            continue;
        }
        const key = arg.slice(2);
        const next = args[i + 1];
        let value;
        if (next !== undefined && !next.startsWith("--")) {
            value = next;
            i++;
        }
        else if (switches.has(key)) {
            value = "true";
        }
        else {
            throw new InvalidArgumentError(missingValueMessage(key, next));
        }
        flags[key] = value;
        (flagArrays[key] ??= []).push(value);
    }
    return { flags, flagArrays, positional };
}
function missingValueMessage(key, next) {
    return next === undefined
        ? `Flag --${key} needs a value.`
        : `Flag --${key} needs a value, but "${next}" reads as the next flag. Values cannot start with --.`;
}
