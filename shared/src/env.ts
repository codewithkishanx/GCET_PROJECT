import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

/**
 * Loads the nearest `.env` file walking up from `startDir`.
 * Both the API and the worker start inside their own package directory, so the
 * single repository-level `.env` is found without duplicating configuration.
 */
export function loadEnv(startDir: string = process.cwd(), levels = 4): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i < levels; i += 1) {
    const candidate = path.join(dir, ".env");
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate, quiet: true });
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
