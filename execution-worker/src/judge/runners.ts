import type { Language } from "@dsa/shared";
import type { WorkerConfig } from "../config";

export interface Runner {
  /** Pinned, allowlisted image. Users never choose an image or a command. */
  image: string;
  filename: string;
  argv: string[];
  env?: Record<string, string>;
  /** Reserved startup line; see `STARTUP_MARKER`. */
  startupMarker: string;
}

/**
 * Printed to stderr by the trusted wrapper immediately before the submitted
 * program is exec'd. The sandbox starts the program's own clock only after the
 * marker arrives, so container startup and C++ compilation do not consume the
 * challenge time limit.
 */
export const STARTUP_MARKER = "__DSA_PROG_START__";

/**
 * Fixed command vectors per language. Nothing here is derived from user input:
 * the source file name and path are constants and the source itself arrives as
 * file content, never as a command-line argument.
 */
export function runnersFor(images: WorkerConfig["images"]): Record<Language, Runner> {
  return {
    python: {
      image: images.python,
      filename: "main.py",
      argv: [
        "/bin/sh",
        "-c",
        `echo ${STARTUP_MARKER} >&2; exec python3 /src/main.py`,
      ],
      env: { PYTHONDONTWRITEBYTECODE: "1", PYTHONUNBUFFERED: "1" },
      startupMarker: STARTUP_MARKER,
    },
    javascript: {
      image: images.javascript,
      filename: "main.js",
      argv: ["/bin/sh", "-c", `echo ${STARTUP_MARKER} >&2; exec node /src/main.js`],
      env: { NODE_NO_WARNINGS: "1" },
      startupMarker: STARTUP_MARKER,
    },
    cpp: {
      image: images.cpp,
      filename: "main.cpp",
      // Compile, then run. Exit code 90 means the compiler rejected the source.
      // The marker is emitted only after a successful compile.
      argv: [
        "/bin/sh",
        "-c",
        "g++ -std=c++17 -O2 -pipe -o /work/main /src/main.cpp 2>/tmp/ce.txt; rc=$?; " +
          `if [ $rc -ne 0 ]; then cat /tmp/ce.txt >&2; exit 90; fi; ` +
          `echo ${STARTUP_MARKER} >&2; exec /work/main`,
      ],
      startupMarker: STARTUP_MARKER,
    },
  };
}

export const COMPILATION_ERROR_EXIT_CODE = 90;
