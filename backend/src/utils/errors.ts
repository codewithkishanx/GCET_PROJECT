export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(code: string, message: string, details?: unknown): AppError {
    return new AppError(400, code, message, details);
  }

  static unauthorized(code = "AUTH_REQUIRED", message = "Authentication required"): AppError {
    return new AppError(401, code, message);
  }

  static forbidden(code = "FORBIDDEN", message = "You do not have access to this resource"): AppError {
    return new AppError(403, code, message);
  }

  static notFound(code = "NOT_FOUND", message = "Resource not found"): AppError {
    return new AppError(404, code, message);
  }

  static conflict(code = "CONFLICT", message = "Resource already exists"): AppError {
    return new AppError(409, code, message);
  }

  static payloadTooLarge(message = "Request body is too large"): AppError {
    return new AppError(413, "PAYLOAD_TOO_LARGE", message);
  }

  static tooManyRequests(message = "Too many requests, please slow down"): AppError {
    return new AppError(429, "RATE_LIMITED", message);
  }

  static internal(message = "Something went wrong"): AppError {
    return new AppError(500, "INTERNAL_ERROR", message);
  }

  static serviceUnavailable(code: string, message: string): AppError {
    return new AppError(503, code, message);
  }
}
