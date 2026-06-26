/** Read-only IBKR Client Portal paths permitted by this app. */
export const IBKR_READ_ONLY_EXACT_PATHS = new Set([
  "/tickle",
  "/iserver/auth/status",
  "/iserver/auth/ssodh/init",
  "/iserver/accounts",
  "/trsrv/stocks",
  "/iserver/secdef/search",
  "/iserver/secdef/strikes",
  "/iserver/secdef/info",
  "/iserver/marketdata/snapshot",
  "/iserver/marketdata/history",
]);

const CONTRACT_INFO_PATTERN = /^\/iserver\/contract\/\d+\/info$/;

/** Exact paths that must never be called from the read-only client. */
const IBKR_FORBIDDEN_EXACT_PATHS = new Set([
  "/logout",
]);

/** Path fragments that block unless the path is explicitly allowed above. */
const IBKR_FORBIDDEN_FRAGMENTS = [
  "/order",
  "/orders",
  "/reply/",
  "/trades",
  "/portfolio/",
];

/** Block /iserver/account/* trading paths but not /iserver/accounts. */
const IBKR_FORBIDDEN_ACCOUNT_PREFIX = "/iserver/account/";

export function normalizeIbkrPath(path: string): string {
  const withoutQuery = path.split("?")[0] ?? path;
  if (!withoutQuery.startsWith("/")) {
    return `/${withoutQuery}`;
  }
  return withoutQuery;
}

export function isIbkrPathAllowed(path: string): boolean {
  const normalized = normalizeIbkrPath(path);
  if (IBKR_FORBIDDEN_EXACT_PATHS.has(normalized)) {
    return false;
  }
  if (normalized.startsWith(IBKR_FORBIDDEN_ACCOUNT_PREFIX)) {
    return false;
  }
  for (const fragment of IBKR_FORBIDDEN_FRAGMENTS) {
    if (normalized.includes(fragment)) {
      return false;
    }
  }
  if (IBKR_READ_ONLY_EXACT_PATHS.has(normalized)) {
    return true;
  }
  return CONTRACT_INFO_PATTERN.test(normalized);
}

export function assertIbkrPathAllowed(path: string): void {
  if (!isIbkrPathAllowed(path)) {
    throw new Error(`IBKR read-only client blocked path: ${normalizeIbkrPath(path)}`);
  }
}
