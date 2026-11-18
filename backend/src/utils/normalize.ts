export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Byte length of the submitted source, used to enforce MAX_SOURCE_BYTES. */
export function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

export function normalizeTag(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 30);
}
