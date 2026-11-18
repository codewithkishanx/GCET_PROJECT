import { spawn } from "node:child_process";
import crypto from "node:crypto";

export interface SandboxRequest {
  image: string;
  /** Fixed argument vector chosen by the runner. Never contains user input. */
  argv: string[];
  stdin: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  outputLimitBytes: number;
  /** Docker volume holding the read-only source, prepared per submission. */
  sourceVolume: string;
  env?: Record<string, string>;
  /** Emitted by the runner right before the submitted program starts. */
  startupMarker?: string;
  /** Upper bound for image start + compilation before the program starts. */
  startupBudgetMs?: number;
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  /** True when the runner's start marker was seen, i.e. the program itself ran. */
  programStarted: boolean;
  outputLimitExceeded: boolean;
  /** Pure program duration when the program started, otherwise wall time. */
  durationMs: number;
  wallMs: number;
  launchError: string | null;
}

const LABEL = "dsa-judge";
const MAX_STDOUT_BYTES = 2 * 1024 * 1024;
const MAX_STDERR_BYTES = 256 * 1024;
const DEFAULT_STARTUP_BUDGET_MS = 20_000;

function stamp(): string {
  return `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

export function containerName(): string {
  return `${LABEL}-${stamp()}`;
}

function runCommand(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

/** Cached Docker daemon probe with TTL so transient delays never permanently lock the worker. */
let dockerAvailable: boolean | null = null;
let lastDockerProbeAt = 0;
const DOCKER_PROBE_TTL_MS = 5_000;

export async function isDockerAvailable(): Promise<boolean> {
  const now = Date.now();
  if (dockerAvailable === true && now - lastDockerProbeAt < DOCKER_PROBE_TTL_MS) {
    return true;
  }
  const result = await runCommand("docker", ["info", "--format", "{{.ServerVersion}}"], 20_000);
  const ok = result.code === 0 && result.stdout.trim().length > 0;
  dockerAvailable = ok;
  lastDockerProbeAt = now;
  return ok;
}

export async function imageExists(image: string): Promise<boolean> {
  const result = await runCommand("docker", ["image", "inspect", image], 10_000);
  return result.code === 0;
}

async function forceRemoveContainer(name: string): Promise<void> {
  await runCommand("docker", ["rm", "-f", name], 15_000);
}

async function removeVolume(volume: string): Promise<void> {
  await runCommand("docker", ["volume", "rm", "-f", volume], 15_000);
}

/**
 * Copies the submission into a Docker-managed volume.
 *
 * A named volume is used because a host bind mount costs seconds per container
 * on Windows and exposes a host path to untrusted code. `docker cp` into a
 * created container writes to the volume as the daemon (root), so the file is
 * readable by the unprivileged runtime user without any chown step.
 */
export async function createSourceVolume(
  image: string,
  hostFile: string,
  filename: string,
): Promise<string> {
  const volume = `dsa-src-${stamp()}`;
  const prep = `dsa-srcprep-${stamp()}`;

  try {
    const created = await runCommand("docker", ["volume", "create", volume], 20_000);
    if (created.code !== 0) throw new Error("could not create the source volume");

    const container = await runCommand(
      "docker",
      ["create", "--name", prep, "-v", `${volume}:/src`, image],
      20_000,
    );
    if (container.code !== 0) throw new Error("could not create the source staging container");

    const copied = await runCommand(
      "docker",
      ["cp", hostFile, `${prep}:/src/${filename}`],
      20_000,
    );
    if (copied.code !== 0) throw new Error("could not copy the source into the sandbox volume");

    return volume;
  } catch (error) {
    await removeVolume(volume);
    throw error;
  } finally {
    await forceRemoveContainer(prep);
  }
}

export async function destroySourceVolume(volume: string): Promise<void> {
  await removeVolume(volume);
}

/**
 * Runs untrusted code inside a throwaway container.
 *
 * The container has no network, a read-only root filesystem, a size-limited
 * writable tmpfs for the working directory, a non-root user, all Linux
 * capabilities dropped, no-new-privileges, a PID limit, a memory limit and a
 * CPU quota. Wall-clock limits are enforced from the host.
 */
export async function runSandbox(request: SandboxRequest): Promise<SandboxResult> {
  const name = containerName();
  const startedAt = performance.now();
  const marker = request.startupMarker;
  const startupBudget = request.startupBudgetMs ?? DEFAULT_STARTUP_BUDGET_MS;

  const args = [
    "run",
    "-i",
    "--rm",
    "--name",
    name,
    "--label",
    `${LABEL}=1`,
    "--network",
    "none",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--user",
    "65534:65534",
    "--memory",
    `${request.memoryLimitMb}m`,
    "--memory-swap",
    `${request.memoryLimitMb}m`,
    "--cpus",
    "0.5",
    "--pids-limit",
    "64",
    "--tmpfs",
    "/work:rw,exec,nosuid,size=64m,mode=1777",
    "--tmpfs",
    "/tmp:rw,exec,nosuid,size=32m,mode=1777",
    "--mount",
    `type=volume,source=${request.sourceVolume},target=/src,readonly`,
    "--workdir",
    "/work",
    "--env",
    "HOME=/work",
  ];

  for (const [key, value] of Object.entries(request.env ?? {})) {
    args.push("--env", `${key}=${value}`);
  }

  args.push(request.image, ...request.argv);

  return new Promise<SandboxResult>((resolve) => {
    const child = spawn("docker", args, { windowsHide: true });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let outputLimitExceeded = false;
    let programStarted = false;
    let programStartedAt: number | null = null;
    let settled = false;
    let launchError: string | null = null;
    let timer: NodeJS.Timeout;

    const finish = (exitCode: number | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const now = performance.now();
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        exitCode,
        timedOut,
        programStarted,
        outputLimitExceeded,
        durationMs: Math.round(
          programStartedAt === null ? now - startedAt : now - programStartedAt,
        ),
        wallMs: Math.round(now - startedAt),
        launchError,
      });
    };

    const kill = (): void => {
      // Kill the container, not just the CLI process.
      void forceRemoveContainer(name);
      child.kill();
    };

    /**
     * Before the start marker arrives, the budget covers image start and (for
     * C++) compilation. Afterwards only the program's own time limit applies,
     * so container startup never causes a false TLE.
     */
    const arm = (ms: number): void => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        timedOut = true;
        kill();
        finish(null);
      }, ms);
    };

    arm(startupBudget + request.timeLimitMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes <= MAX_STDOUT_BYTES) stdoutChunks.push(chunk);
      if (stdoutBytes > request.outputLimitBytes) {
        outputLimitExceeded = true;
        kill();
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes <= MAX_STDERR_BYTES) stderrChunks.push(chunk);

      if (!programStarted && marker) {
        const text = Buffer.concat(stderrChunks).toString("utf8");
        if (text.includes(marker)) {
          programStarted = true;
          programStartedAt = performance.now();
          arm(request.timeLimitMs + 500);
        }
      }
    });

    child.on("error", (error) => {
      launchError = error.message;
      finish(null);
    });

    child.on("close", (code) => {
      finish(code);
    });

    child.stdin?.on("error", () => {
      /* broken pipe when the container exits early */
    });
    child.stdin?.end(request.stdin);
  });
}

/**
 * Removes judge containers and source volumes left behind by a crashed worker.
 */
export async function reapStaleContainers(maxAgeMs: number): Promise<number> {
  const now = Date.now();
  let removed = 0;

  const listed = await runCommand(
    "docker",
    ["ps", "--filter", `label=${LABEL}=1`, "--format", "{{.Names}}"],
    10_000,
  );
  if (listed.code === 0) {
    for (const name of listed.stdout.split("\n").map((line) => line.trim()).filter(Boolean)) {
      const match = /^dsa-judge-(\d+)-/.exec(name);
      if (!match) continue;
      const createdAt = Number(match[1]);
      if (Number.isFinite(createdAt) && now - createdAt > maxAgeMs) {
        await forceRemoveContainer(name);
        removed += 1;
      }
    }
  }

  const volumes = await runCommand(
    "docker",
    ["volume", "ls", "--filter", "name=dsa-src-", "--format", "{{.Name}}"],
    10_000,
  );
  if (volumes.code === 0) {
    for (const name of volumes.stdout.split("\n").map((line) => line.trim()).filter(Boolean)) {
      const match = /^dsa-src-(\d+)-/.exec(name);
      if (!match) continue;
      const createdAt = Number(match[1]);
      if (Number.isFinite(createdAt) && now - createdAt > maxAgeMs) {
        await removeVolume(name);
        removed += 1;
      }
    }
  }

  return removed;
}
