import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { HiddenTest, Language } from "@dsa/shared";
import type { WorkerConfig } from "../config";
import { isDockerAvailable } from "../sandbox/docker";
import { judgeSubmission } from "./judge";

/**
 * Real sandbox tests. They are skipped unless RUN_DOCKER_TESTS=1 so that
 * `npm test` stays fast and works on machines without Docker:
 *
 *   npm run images:build
 *   RUN_DOCKER_TESTS=1 npm run test -w @dsa/worker
 */
const RUN_DOCKER_TESTS = process.env.RUN_DOCKER_TESTS === "1";
const describeDocker = RUN_DOCKER_TESTS ? describe : describe.skip;

const workRoot = path.join(os.tmpdir(), "dsa-arcade-worker-tests");

const config: WorkerConfig = {
  nodeEnv: "test",
  mongoUri: "mongodb://127.0.0.1:27017/dsa_arcade_worker_test",
  redisUrl: "redis://127.0.0.1:6379",
  queueName: "code-execution-test",
  concurrency: 1,
  workRoot,
  images: {
    python: process.env.JUDGE_IMAGE_PYTHON ?? "dsa-judge-python:3.12",
    javascript: process.env.JUDGE_IMAGE_NODE ?? "dsa-judge-node:24",
    cpp: process.env.JUDGE_IMAGE_CPP ?? "dsa-judge-cpp:14",
  },
  maxContainerAgeMs: 600_000,
  logLevel: "silent",
};

const SUM_TESTS: HiddenTest[] = [
  { name: "three", stdin: "3\n1 2 3\n", expectedStdout: "6\n" },
  { name: "negatives", stdin: "4\n-1 -2 3 4\n", expectedStdout: "4\n" },
  { name: "large", stdin: "3\n1000000000 1000000000 1000000000\n", expectedStdout: "3000000000\n" },
];

const PYTHON_SUM = `
import sys

def main() -> None:
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    print(sum(int(value) for value in data[1:1 + n]))

main()
`;

const JS_SUM = `
const fs = require("node:fs");
const tokens = fs.readFileSync(0, "utf8").trim().split(/\\s+/).filter(Boolean);
if (tokens.length > 0) {
  const n = Number(tokens[0]);
  let total = 0;
  for (let i = 0; i < n; i += 1) total += Number(tokens[i + 1]);
  console.log(total);
}
`;

const CPP_SUM = `
#include <iostream>
#include <vector>

int main() {
    int n = 0;
    if (!(std::cin >> n)) return 0;
    long long total = 0;
    for (int i = 0; i < n; ++i) {
        long long value = 0;
        std::cin >> value;
        total += value;
    }
    std::cout << total << "\\n";
    return 0;
}
`;

function judge(
  language: Language,
  sourceCode: string,
  overrides: {
    tests?: HiddenTest[];
    timeLimitMs?: number;
    memoryLimitMb?: number;
    outputLimitBytes?: number;
  } = {},
) {
  return judgeSubmission({
    language,
    sourceCode,
    tests: overrides.tests ?? SUM_TESTS,
    timeLimitMs: overrides.timeLimitMs ?? 4_000,
    memoryLimitMb: overrides.memoryLimitMb ?? 128,
    outputLimitBytes: overrides.outputLimitBytes ?? 64_000,
    config,
  });
}

let dockerReady = false;

async function skipWithoutDocker(t: { skip: () => void }): Promise<boolean> {
  if (dockerReady) return false;
  t.skip();
  return true;
}

describeDocker("docker sandbox judge", () => {
  beforeAll(async () => {
    dockerReady = await isDockerAvailable();
    await fs.mkdir(workRoot, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(workRoot, { recursive: true, force: true }).catch(() => undefined);
  });

  it("accepts a correct Python solution", async (t) => {
    if (await skipWithoutDocker(t)) return;
    const result = await judge("python", PYTHON_SUM);
    expect(result.verdict).toBe("ACCEPTED");
    expect(result.passedTests).toBe(SUM_TESTS.length);
    expect(result.outputPreview).toBeNull();
  }, 120_000);

  it("accepts a correct JavaScript solution", async (t) => {
    if (await skipWithoutDocker(t)) return;
    const result = await judge("javascript", JS_SUM);
    expect(result.verdict).toBe("ACCEPTED");
    expect(result.passedTests).toBe(SUM_TESTS.length);
  }, 120_000);

  it("accepts a correct C++ solution", async (t) => {
    if (await skipWithoutDocker(t)) return;
    const result = await judge("cpp", CPP_SUM);
    expect(result.verdict).toBe("ACCEPTED");
    expect(result.passedTests).toBe(SUM_TESTS.length);
  }, 120_000);

  it("reports WRONG_ANSWER without leaking the expected output", async (t) => {
    if (await skipWithoutDocker(t)) return;
    const result = await judge("python", "print(0)\n");
    expect(result.verdict).toBe("WRONG_ANSWER");
    expect(result.passedTests).toBe(0);
    expect(JSON.stringify(result)).not.toContain("3000000000");
    expect(result.message).toContain("test 1");
  }, 120_000);

  it("reports COMPILATION_ERROR for C++ that does not compile", async (t) => {
    if (await skipWithoutDocker(t)) return;
    const result = await judge("cpp", "int main() { this is not C++ }\n");
    expect(result.verdict).toBe("COMPILATION_ERROR");
    expect(result.passedTests).toBe(0);
    expect(result.outputPreview).toBeTruthy();
  }, 120_000);

  it("reports RUNTIME_ERROR for uncaught exceptions", async (t) => {
    if (await skipWithoutDocker(t)) return;
    const result = await judge("python", "raise RuntimeError('boom')\n");
    expect(result.verdict).toBe("RUNTIME_ERROR");
    expect(result.message).toContain("exit code");
  }, 120_000);

  it("enforces the wall-clock limit from the host", async (t) => {
    if (await skipWithoutDocker(t)) return;
    const started = Date.now();
    const result = await judge("python", "while True:\n    pass\n", {
      timeLimitMs: 1_000,
    });
    expect(result.verdict).toBe("TIME_LIMIT_EXCEEDED");
    expect(Date.now() - started).toBeLessThan(15_000);
  }, 120_000);

  it("enforces the output limit", async (t) => {
    if (await skipWithoutDocker(t)) return;
    const result = await judge(
      "python",
      "print('x' * 200000)\n",
      { outputLimitBytes: 4_000 },
    );
    expect(result.verdict).toBe("OUTPUT_LIMIT_EXCEEDED");
  }, 120_000);

  it("runs without network access, as a non-root user, on a read-only root", async (t) => {
    if (await skipWithoutDocker(t)) return;

    const probe = `
import os
import socket

network = "NO_NETWORK"
try:
    socket.create_connection(("1.1.1.1", 53), timeout=2)
    network = "NETWORK"
except OSError:
    pass

root = "ROOT_READONLY"
try:
    with open("/probe", "w") as handle:
        handle.write("x")
    root = "ROOT_WRITABLE"
except OSError:
    pass

work = "WORK_READONLY"
try:
    with open("work.txt", "w") as handle:
        handle.write("ok")
    work = "WORK_WRITABLE"
except OSError:
    pass

print(network, root, work, os.getuid())
`;

    const result = await judge("python", probe, {
      tests: [
        {
          name: "isolation",
          stdin: "",
          expectedStdout: "NO_NETWORK ROOT_READONLY WORK_WRITABLE 65534\n",
        },
      ],
    });
    expect(result.verdict).toBe("ACCEPTED");
  }, 120_000);

  it("isolates every test case in a fresh container", async (t) => {
    if (await skipWithoutDocker(t)) return;

    // Writing to the read-only /src never succeeds, and the /work tmpfs is
    // discarded between runs, so the counter can never reach 2.
    const source = `
import os

try:
    with open("/src/state.txt", "r") as handle:
        count = int(handle.read())
except OSError:
    count = 0

count += 1
print(count)
`;

    const result = await judge("python", source, {
      tests: [
        { name: "first", stdin: "", expectedStdout: "1\n" },
        { name: "second", stdin: "", expectedStdout: "1\n" },
      ],
    });
    expect(result.verdict).toBe("ACCEPTED");
    expect(result.passedTests).toBe(2);
  }, 120_000);
});
