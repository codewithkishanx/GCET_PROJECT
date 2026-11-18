import mongoose, { type Model, type Schema } from "mongoose";

/**
 * Re-uses an already compiled model so hot reload and test re-imports do not
 * throw OverwriteModelError.
 *
 * The cast is intentional: instantiating `Model<T>` from an untyped `Schema`
 * makes TypeScript infer an enormous recursive type, so the generic is applied
 * only to the exported handle.
 */
export function getModel<T>(name: string, schema: Schema): Model<T> {
  const existing = mongoose.models[name];
  if (existing) return existing as unknown as Model<T>;
  return mongoose.model(name, schema) as unknown as Model<T>;
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

/** Converts a Mongoose Map (or a lean plain object) into a plain record. */
export function mapToRecord(value: unknown): Record<string, string> {
  if (value instanceof Map) {
    return Object.fromEntries(value as Map<string, string>);
  }
  if (value && typeof value === "object") {
    return value as Record<string, string>;
  }
  return {};
}
