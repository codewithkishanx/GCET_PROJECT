export type CompareReason =
  | "ok"
  | "line_mismatch"
  | "line_count_mismatch"
  | "token_mismatch";

export interface CompareResult {
  equal: boolean;
  reason: CompareReason;
  /** 1-based line number of the first difference. Never contains expected text. */
  line?: number;
}

/**
 * Canonical output normalization used by the judge:
 *  - CRLF / CR become LF
 *  - trailing spaces and tabs on every line are removed
 *  - trailing empty lines are removed
 * Leading whitespace is preserved because it can be significant.
 */
export function normalizeOutput(text: string): string {
  const unified = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = unified.split("\n").map((line) => line.replace(/[ \t]+$/g, ""));
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

function tokensEqual(a: string, b: string, tolerance: number): boolean {
  const left = Number(a);
  const right = Number(b);
  if (Number.isFinite(left) && Number.isFinite(right)) {
    const diff = Math.abs(left - right);
    return diff <= tolerance || diff <= tolerance * Math.abs(right);
  }
  return a === b;
}

/**
 * Compares program output with the trusted expected output.
 * When `floatTolerance > 0`, tokens that both parse as finite numbers are
 * compared with an absolute or relative tolerance.
 */
export function compareOutput(
  actual: string,
  expected: string,
  floatTolerance = 0,
): CompareResult {
  const actualLines = normalizeOutput(actual).split("\n");
  const expectedLines = normalizeOutput(expected).split("\n");

  const actualEmpty = actualLines.length === 1 && actualLines[0] === "";
  const expectedEmpty = expectedLines.length === 1 && expectedLines[0] === "";
  if (actualEmpty && expectedEmpty) return { equal: true, reason: "ok" };
  if (actualEmpty !== expectedEmpty && normalizeOutput(actual) !== normalizeOutput(expected)) {
    return { equal: false, reason: "line_count_mismatch", line: 1 };
  }

  const shared = Math.min(actualLines.length, expectedLines.length);
  for (let i = 0; i < shared; i += 1) {
    const a = actualLines[i] ?? "";
    const e = expectedLines[i] ?? "";
    if (a === e) continue;

    if (floatTolerance > 0) {
      const aTokens = a.trim().split(/\s+/);
      const eTokens = e.trim().split(/\s+/);
      const sameTokens =
        aTokens.length === eTokens.length &&
        aTokens.every((token, index) => tokensEqual(token, eTokens[index] ?? "", floatTolerance));
      if (sameTokens) continue;
    }

    return { equal: false, reason: "line_mismatch", line: i + 1 };
  }

  if (actualLines.length !== expectedLines.length) {
    return {
      equal: false,
      reason: "line_count_mismatch",
      line: shared + 1,
    };
  }

  return { equal: true, reason: "ok" };
}

/** Hard cap for untrusted compiler/runtime output before it reaches the API. */
export function truncateOutput(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
  const buffer = Buffer.from(text, "utf8").subarray(0, maxBytes);
  return `${buffer.toString("utf8")}\n[output truncated]`;
}
