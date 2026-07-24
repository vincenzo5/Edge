/** @typedef {{ key: string; value: string }} SecurityHeader */

const BASE_SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/**
 * Enforced CSP for the Next.js app shell (chart, Copilot, workspace).
 * Exceptions documented in docs/CONSTRAINTS.md Security.
 *
 * @param {boolean} isProduction
 * @returns {SecurityHeader[]}
 */
export function buildAppSecurityHeaders(isProduction) {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  /** @type {SecurityHeader[]} */
  const headers = [
    ...BASE_SECURITY_HEADERS,
    { key: "Content-Security-Policy", value: csp },
  ];

  if (isProduction) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  return headers;
}

/**
 * Looser CSP for static demo HTML under /animations and /brand.
 *
 * @returns {SecurityHeader[]}
 */
export function buildDemoSecurityHeaders() {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
  ].join("; ");

  return [
    ...BASE_SECURITY_HEADERS,
    { key: "Content-Security-Policy", value: csp },
  ];
}

/**
 * @param {boolean} isProduction
 * @returns {{ source: string; headers: SecurityHeader[] }[]}
 */
export function buildSecurityHeaderRoutes(isProduction) {
  const demoHeaders = buildDemoSecurityHeaders();
  return [
    { source: "/animations/:path*", headers: demoHeaders },
    { source: "/brand/:path*", headers: demoHeaders },
    { source: "/:path*", headers: buildAppSecurityHeaders(isProduction) },
  ];
}
