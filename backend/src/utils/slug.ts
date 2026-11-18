import crypto from "node:crypto";

export function slugify(input: string, fallback = "item"): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return slug || `${fallback}-${crypto.randomBytes(3).toString("hex")}`;
}

/**
 * Finds a free slug: base, base-2 ... base-5, then a random suffix.
 * The unique index is still the final authority under concurrent writes.
 */
export async function generateUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await exists(base))) return base;
  for (let suffix = 2; suffix <= 5; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${base}-${crypto.randomBytes(4).toString("hex")}`;
}
