export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;

  // Trim + Unicode normalize to reduce confusables / odd whitespace issues.
  const trimmed = input.trim().normalize("NFKC");
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // Very small sanity check (not full RFC):
  // - has exactly one "@"
  // - at least 1 char before and after "@"
  const at = lower.indexOf("@");
  if (at <= 0) return null;
  if (lower.indexOf("@", at + 1) !== -1) return null;
  if (at === lower.length - 1) return null;

  return lower;
}
