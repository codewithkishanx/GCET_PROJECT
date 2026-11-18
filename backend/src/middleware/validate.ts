import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validates at the HTTP boundary and stores the parsed result on
 * `req.validated`. `req.query` is a getter in Express 5, so it is never mutated.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.validated = {
        body: schemas.body ? schemas.body.parse(req.body) : undefined,
        query: schemas.query ? schemas.query.parse(req.query) : undefined,
        params: schemas.params ? schemas.params.parse(req.params) : undefined,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validated<T>(req: Request, key: "body" | "query" | "params"): T {
  const value = req.validated?.[key];
  if (value === undefined) {
    throw new Error(`Missing validated ${key}: did you forget the validate() middleware?`);
  }
  return value as T;
}
