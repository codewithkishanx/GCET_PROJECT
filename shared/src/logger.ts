import pino, { type Logger, type LoggerOptions } from "pino";

const REDACTED = "[redacted]";

const REDACT_PATHS = [
  "req.headers.cookie",
  "req.headers.authorization",
  "req.headers['x-csrf-token']",
  "res.headers['set-cookie']",
  "password",
  "*.password",
  "passwordHash",
  "*.passwordHash",
  "token",
  "*.token",
  "accessToken",
  "refreshToken",
  "*.accessToken",
  "*.refreshToken",
  "sourceCode",
  "*.sourceCode",
  "hiddenTests",
  "*.hiddenTests",
  "referenceSolutions",
  "*.referenceSolutions",
];

export function createLogger(service: string, level = process.env.LOG_LEVEL ?? "info"): Logger {
  const options: LoggerOptions = {
    name: service,
    level,
    base: { service },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: REDACT_PATHS, censor: REDACTED },
  };
  return pino(options);
}
