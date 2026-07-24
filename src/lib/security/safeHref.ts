const BLOCKED_SCHEME = /^(javascript|data|vbscript):/i;

function trimmed(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function isAllowedHref(value: string | null | undefined): boolean {
  const href = trimmed(value);
  if (!href) return false;
  if (BLOCKED_SCHEME.test(href)) return false;

  if (href.startsWith("/")) {
    return !href.startsWith("//");
  }

  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeHref(value: string | null | undefined): string | null {
  if (!isAllowedHref(value)) return null;
  return trimmed(value);
}

/** Normalize upstream website fields to https when scheme is omitted. */
export function normalizeExternalHref(value: string | null | undefined): string | null {
  const raw = trimmed(value);
  if (!raw) return null;

  const candidate =
    raw.startsWith("/") || raw.startsWith("http://") || raw.startsWith("https://")
      ? raw
      : `https://${raw}`;

  return sanitizeHref(candidate);
}
