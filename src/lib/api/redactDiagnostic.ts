const DEFAULT_MAX_LENGTH = 240;
const REDACTED = "[REDACTED]";

const SENSITIVE_KEY =
  "api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password|authorization|account(?:id|number)?";
const SENSITIVE_KEY_NAME = new RegExp(`^(?:${SENSITIVE_KEY})$`, "i");
const SENSITIVE_QUOTED_KEY_VALUE = new RegExp(
  `(["'])(${SENSITIVE_KEY})\\1(\\s*:\\s*)(["'])((?:\\\\.|(?!\\4).)*)\\4`,
  "gi",
);
const SENSITIVE_KEY_VALUE = new RegExp(
  `\\b(${SENSITIVE_KEY})\\b(\\s*[:=]\\s*)([^\\s,;}"']+)`,
  "gi",
);
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const IB_ACCOUNT_ID = /\b(?:DU|U)\d{5,}\b/g;
const URL_WITH_QUERY = /\bhttps?:\/\/[^\s]+/gi;

function redactUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.username) url.username = REDACTED;
    if (url.password) url.password = REDACTED;
    if (url.search) url.search = `?${REDACTED}`;
    return url.toString();
  } catch {
    return raw.replace(/\?.*$/, `?${REDACTED}`);
  }
}

/** Sanitizes bounded diagnostic text before logs, APIs, or operator reports. */
export function redactDiagnostic(
  value: unknown,
  options: { maxLength?: number } = {},
): string {
  const maxLength = Math.max(0, options.maxLength ?? DEFAULT_MAX_LENGTH);
  let text: string;
  if (value instanceof Error) {
    text = value.message;
  } else if (typeof value === "object" && value !== null) {
    try {
      text = JSON.stringify(value, (key, nestedValue) => {
        if (SENSITIVE_KEY_NAME.test(key)) return REDACTED;
        return typeof nestedValue === "string"
          ? redactDiagnostic(nestedValue)
          : nestedValue;
      });
    } catch {
      text = String(value);
    }
  } else {
    text = String(value ?? "");
  }
  const redacted = text
    .replace(URL_WITH_QUERY, redactUrl)
    .replace(BEARER_TOKEN, `Bearer ${REDACTED}`)
    .replace(
      SENSITIVE_QUOTED_KEY_VALUE,
      (_match, keyQuote: string, key: string, separator: string, valueQuote: string) =>
        `${keyQuote}${key}${keyQuote}${separator}${valueQuote}${REDACTED}${valueQuote}`,
    )
    .replace(SENSITIVE_KEY_VALUE, (_match, key: string, separator: string) => {
      return `${key}${separator}${REDACTED}`;
    })
    .replace(IB_ACCOUNT_ID, REDACTED)
    .trim();
  return redacted.slice(0, maxLength);
}

/** Sanitizes warning arrays at API and operator-report boundaries. */
export function redactDiagnosticList(warnings: string[]): string[] {
  return warnings.map((warning) => redactDiagnostic(warning));
}

export const DIAGNOSTIC_REDACTION = {
  defaultMaxLength: DEFAULT_MAX_LENGTH,
  replacement: REDACTED,
} as const;
