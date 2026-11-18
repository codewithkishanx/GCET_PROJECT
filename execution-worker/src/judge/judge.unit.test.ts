import { describe, expect, it } from "vitest";
import {
  compareOutput,
  normalizeOutput,
  truncateOutput,
} from "@dsa/shared";
import { COMPILATION_ERROR_EXIT_CODE, runnersFor } from "./runners";
import { loadWorkerConfig } from "../config";

describe("output normalization", () => {
  it("unifies line endings and strips trailing whitespace per line", () => {
    expect(normalizeOutput("a  \r\nb\t\r\n\r\n")).toBe("a\nb");
    expect(normalizeOutput("a\rb\r\n")).toBe("a\nb");
  });

  it("preserves leading whitespace because it can be significant", () => {
    expect(normalizeOutput("  indented\n    deeper")).toBe("  indented\n    deeper");
  });

  it("treats trailing blank lines as insignificant", () => {
    expect(normalizeOutput("42\n\n\n")).toBe("42");
    expect(normalizeOutput("\n\n")).toBe("");
  });
});

describe("output comparison", () => {
  it("accepts identical output with different trailing whitespace", () => {
    expect(compareOutput("1 2 3   \n", "1 2 3\n")).toEqual({ equal: true, reason: "ok" });
  });

  it("reports the first differing line without leaking expected text", () => {
    const result = compareOutput("1\n99\n3\n", "1\n2\n3\n");
    expect(result.equal).toBe(false);
    expect(result.reason).toBe("line_mismatch");
    expect(result.line).toBe(2);
    expect(JSON.stringify(result)).not.toContain("2\\n");
  });

  it("detects missing and extra lines", () => {
    expect(compareOutput("1\n", "1\n2\n")).toMatchObject({
      equal: false,
      reason: "line_count_mismatch",
    });
    expect(compareOutput("1\n2\n", "1\n")).toMatchObject({
      equal: false,
      reason: "line_count_mismatch",
    });
  });

  it("compares numeric tokens within an explicit tolerance", () => {
    expect(compareOutput("3.14159\n", "3.14160\n", 1e-4).equal).toBe(true);
    expect(compareOutput("3.2\n", "3.1\n", 1e-4).equal).toBe(false);
  });

  it("distinguishes an empty expected output from a non-empty one", () => {
    expect(compareOutput("", "").equal).toBe(true);
    expect(compareOutput("x", "").equal).toBe(false);
    expect(compareOutput("", "x").equal).toBe(false);
  });
});

describe("output truncation", () => {
  it("caps output at the byte limit and marks the truncation", () => {
    const truncated = truncateOutput("x".repeat(5_000), 1_000);
    expect(Buffer.byteLength(truncated, "utf8")).toBeLessThan(1_100);
    expect(truncated.endsWith("[output truncated]")).toBe(true);
  });

  it("leaves output within the limit untouched", () => {
    expect(truncateOutput("small", 1_000)).toBe("small");
  });
});

describe("runner configuration", () => {
  it("uses fixed, non-user-controlled argv per language", () => {
    const config = loadWorkerConfig({
      NODE_ENV: "test",
      MONGODB_URI: "mongodb://127.0.0.1:27017/dsa_arcade_worker_test",
      REDIS_URL: "redis://127.0.0.1:6379",
    } as NodeJS.ProcessEnv);
    const runners = runnersFor(config.images);

    expect(runners.python.filename).toBe("main.py");
    expect(runners.python.argv.join(" ")).toContain("/src/main.py");
    expect(runners.javascript.argv.join(" ")).toContain("/src/main.js");
    expect(runners.cpp.filename).toBe("main.cpp");
    expect(runners.cpp.argv.join(" ")).toContain("/src/main.cpp");
    expect(COMPILATION_ERROR_EXIT_CODE).toBe(90);

    // The start marker is emitted by the trusted wrapper, never by user input.
    for (const runner of Object.values(runners)) {
      expect(runner.argv.join(" ")).toContain(runner.startupMarker);
    }
  });
});
