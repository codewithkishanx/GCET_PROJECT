import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  compareOutput,
  truncateOutput,
  type FailedTestInfo,
  type HiddenTest,
  type Language,
  type Verdict,
} from "@dsa/shared";
import type { WorkerConfig } from "../config";
import {
  createSourceVolume,
  destroySourceVolume,
  runSandbox,
} from "../sandbox/docker";
import { COMPILATION_ERROR_EXIT_CODE, runnersFor, type Runner } from "./runners";

export interface JudgeRequest {
  language: Language;
  sourceCode: string;
  tests: HiddenTest[];
  timeLimitMs: number;
  memoryLimitMb: number;
  outputLimitBytes: number;
  config: WorkerConfig;
}

export interface JudgeResult {
  verdict: Verdict;
  passedTests: number;
  totalTests: number;
  durationMs: number;
  memoryKb: number | null;
  outputPreview: string | null;
  failedTest?: FailedTestInfo | null;
  message: string;
}

const PREVIEW_LIMIT = 4_000;

function preview(text: string): string | null {
  const trimmed = truncateOutput(text, PREVIEW_LIMIT).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function systemError(totalTests: number, message: string): JudgeResult {
  return {
    verdict: "SYSTEM_ERROR",
    passedTests: 0,
    totalTests,
    durationMs: 0,
    memoryKb: null,
    outputPreview: null,
    message,
  };
}

async function writeSource(runner: Runner, sourceCode: string): Promise<{ dir: string; file: string }> {
  const root = path.join(os.tmpdir(), "dsa-judge-src");
  await fs.mkdir(root, { recursive: true });
  const dir = await fs.mkdtemp(path.join(root, "run-"));
  const file = path.join(dir, runner.filename);
  await fs.writeFile(file, sourceCode, { encoding: "utf8" });
  return { dir, file };
}

/**
 * Runs the submission against every hidden test in a fresh container.
 *
 * Only counts and a safe message are returned. Hidden inputs, expected outputs
 * and the program's stdout on a failing hidden test are never exposed.
 */
export async function judgeSubmission(request: JudgeRequest): Promise<JudgeResult> {
  const runners = runnersFor(request.config.images);
  const runner = runners[request.language];

  if (!runner) {
    return systemError(request.tests.length, `No runner configured for ${request.language}`);
  }

  if (request.tests.length === 0) {
    return systemError(0, "Challenge has no server-side test cases");
  }

  let workspace: { dir: string; file: string } | null = null;
  let volume: string | null = null;

  try {
    workspace = await writeSource(runner, request.sourceCode);
    volume = await createSourceVolume(runner.image, workspace.file, runner.filename);
  } catch {
    if (workspace) await fs.rm(workspace.dir, { recursive: true, force: true }).catch(() => undefined);
    return systemError(request.tests.length, "Could not prepare the execution sandbox");
  }

  let passed = 0;
  let slowest = 0;

  if (!volume) {
    return systemError(request.tests.length, "Could not prepare the execution sandbox");
  }
  const sourceVolume = volume;

  try {
    for (const [index, test] of request.tests.entries()) {
      const result = await runSandbox({
        image: runner.image,
        argv: runner.argv,
        stdin: test.stdin,
        timeLimitMs: request.timeLimitMs,
        memoryLimitMb: request.memoryLimitMb,
        outputLimitBytes: request.outputLimitBytes,
        sourceVolume,
        env: runner.env,
        startupMarker: runner.startupMarker,
      });

      slowest = Math.max(slowest, result.durationMs);
      const base = {
        passedTests: passed,
        totalTests: request.tests.length,
        durationMs: slowest,
        memoryKb: null,
      };

      if (result.launchError) {
        return {
          ...base,
          verdict: "SYSTEM_ERROR",
          outputPreview: null,
          message: "Execution sandbox could not be started",
        };
      }

      if (result.timedOut && !result.programStarted) {
        return {
          ...base,
          verdict: "SYSTEM_ERROR",
          outputPreview: null,
          message: "Execution did not start within the allowed startup time",
        };
      }

      if (result.timedOut) {
        return {
          ...base,
          verdict: "TIME_LIMIT_EXCEEDED",
          outputPreview: null,
          failedTest: {
            index: index + 1,
            input: truncateOutput(test.stdin, 4_000),
            expectedOutput: truncateOutput(test.expectedStdout, 4_000),
            actualOutput: "(Time limit exceeded)",
          },
          message: `Time limit exceeded on test ${index + 1}`,
        };
      }

      if (result.outputLimitExceeded) {
        return {
          ...base,
          verdict: "OUTPUT_LIMIT_EXCEEDED",
          outputPreview: null,
          failedTest: {
            index: index + 1,
            input: truncateOutput(test.stdin, 4_000),
            expectedOutput: truncateOutput(test.expectedStdout, 4_000),
            actualOutput: "(Output limit exceeded)",
          },
          message: `Output limit exceeded on test ${index + 1}`,
        };
      }

      if (
        request.language === "cpp" &&
        result.exitCode === COMPILATION_ERROR_EXIT_CODE &&
        result.stderr.trim().length > 0
      ) {
        return {
          ...base,
          verdict: "COMPILATION_ERROR",
          outputPreview: preview(result.stderr),
          message: "The compiler rejected the source code",
        };
      }

      if (result.exitCode === 137) {
        return {
          ...base,
          verdict: "MEMORY_LIMIT_EXCEEDED",
          outputPreview: null,
          failedTest: {
            index: index + 1,
            input: truncateOutput(test.stdin, 4_000),
            expectedOutput: truncateOutput(test.expectedStdout, 4_000),
            actualOutput: "(Memory limit exceeded)",
          },
          message: `Memory limit exceeded on test ${index + 1}`,
        };
      }

      if (result.exitCode !== 0) {
        return {
          ...base,
          verdict: "RUNTIME_ERROR",
          outputPreview: preview(result.stderr),
          failedTest: {
            index: index + 1,
            input: truncateOutput(test.stdin, 4_000),
            expectedOutput: truncateOutput(test.expectedStdout, 4_000),
            actualOutput: preview(result.stderr || result.stdout),
          },
          message: `Runtime error on test ${index + 1} (exit code ${result.exitCode ?? "unknown"})`,
        };
      }

      const comparison = compareOutput(result.stdout, test.expectedStdout);
      if (!comparison.equal) {
        return {
          ...base,
          verdict: "WRONG_ANSWER",
          outputPreview: preview(result.stdout),
          failedTest: {
            index: index + 1,
            input: truncateOutput(test.stdin, 4_000),
            expectedOutput: truncateOutput(test.expectedStdout, 4_000),
            actualOutput: preview(result.stdout),
          },
          message: `Wrong answer on test ${index + 1}`,
        };
      }

      passed += 1;
    }

    return {
      verdict: "ACCEPTED",
      passedTests: passed,
      totalTests: request.tests.length,
      durationMs: slowest,
      memoryKb: null,
      outputPreview: null,
      message: `All ${request.tests.length} tests passed`,
    };
  } finally {
    if (volume) await destroySourceVolume(volume);
    if (workspace) {
      await fs.rm(workspace.dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
