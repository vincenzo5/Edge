const DEFAULT_HEADER = "x-edge-request-id";
const MAX_REQUEST_ID_LENGTH = 128;
const REQUEST_ID_PATTERN = /^[\w.-]+$/;

export function getRequestIdHeaderName(): string {
  const configured = process.env.EDGE_REQUEST_ID_HEADER?.trim();
  return configured || DEFAULT_HEADER;
}

export function isValidRequestId(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAX_REQUEST_ID_LENGTH &&
    REQUEST_ID_PATTERN.test(value)
  );
}

export function mintRequestId(): string {
  return crypto.randomUUID();
}

/** Accept a valid incoming ID or mint a new one. */
export function resolveRequestId(headers: Headers): string {
  const headerName = getRequestIdHeaderName();
  const incoming = headers.get(headerName)?.trim();
  if (incoming && isValidRequestId(incoming)) {
    return incoming;
  }
  return mintRequestId();
}
