// Parses the passed-test count from runner summaries. Null means the format is
// unknown, and callers must treat that as "cannot prove no test was lost".
const PASSED_PATTERNS = [
  /Tests\s+(?:\d+ failed \| )?(\d+) passed/,
  /Tests:\s+(?:\d+ failed, )?(\d+) passed/,
  /^# pass (\d+)$/m,
  /^ℹ pass (\d+)$/m,
];

export function parsePassedCount(output: string): number | null {
  for (const pattern of PASSED_PATTERNS) {
    const match = pattern.exec(output);
    if (match?.[1] !== undefined) return Number(match[1]);
  }
  return null;
}

const ASSERTION_CALL = /\bexpect\s*\(|\bassert\w*\s*[.(]/g;

export function countAssertionCalls(source: string): number {
  return source.match(ASSERTION_CALL)?.length ?? 0;
}
