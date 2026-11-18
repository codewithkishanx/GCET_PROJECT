import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { isDuplicateKeyError } from "@dsa/shared";
import type { Logger } from "pino";
import { AppError } from "../utils/errors";

function duplicateField(error: unknown): string[] {
  const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
  return keyPattern ? Object.keys(keyPattern) : [];
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
      requestId: req.id,
    },
  });
}

/**
 * Central error boundary. Client errors are returned as structured JSON;
 * internal details, stack traces and infrastructure messages stay in the logs.
 */
export function errorHandler(logger: Logger) {
  return (error: unknown, req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      next(error);
      return;
    }

    let status = 500;
    let code = "INTERNAL_ERROR";
    let message = "Something went wrong";
    let details: unknown;

    if (error instanceof AppError) {
      status = error.status;
      code = error.code;
      message = error.message;
      details = error.details;
    } else if (error instanceof ZodError) {
      status = 400;
      code = "VALIDATION_ERROR";
      message = "The request is invalid";
      details = error.issues.map((issue) => ({
        path: issue.path.join(".") || "(root)",
        message: issue.message,
      }));
    } else if (error instanceof mongoose.Error.ValidationError) {
      status = 400;
      code = "VALIDATION_ERROR";
      message = "The request is invalid";
      details = Object.values(error.errors).map((item) => ({
        path: item.path,
        message: item.message,
      }));
    } else if (error instanceof mongoose.Error.CastError) {
      status = 400;
      code = "INVALID_IDENTIFIER";
      message = `Invalid value for ${error.path}`;
    } else if (isDuplicateKeyError(error)) {
      status = 409;
      code = "ALREADY_EXISTS";
      const fields = duplicateField(error);
      message = fields.length
        ? `That ${fields.join(", ")} is already in use`
        : "That resource already exists";
    } else if (
      typeof error === "object" &&
      error !== null &&
      (error as { type?: string }).type === "entity.too.large"
    ) {
      status = 413;
      code = "PAYLOAD_TOO_LARGE";
      message = "Request body is too large";
    } else if (
      typeof error === "object" &&
      error !== null &&
      ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(
        (error as { name?: string }).name ?? "",
      )
    ) {
      status = 401;
      code = "INVALID_TOKEN";
      message = "Session is no longer valid, please sign in again";
    }

    const logPayload = {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status,
      code,
      err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    };

    if (status >= 500) {
      logger.error(logPayload, "request failed");
    } else {
      logger.info(logPayload, "request rejected");
    }

    res.status(status).json({
      error: {
        code,
        message,
        requestId: req.id,
        ...(details === undefined ? {} : { details }),
      },
    });
  };
}
