import { describe, expect, it } from "vitest";
import {
  buildAppSecurityHeaders,
  buildDemoSecurityHeaders,
  buildSecurityHeaderRoutes,
} from "./httpHeaders.mjs";

function headerValue(
  headers: { key: string; value: string }[],
  name: string,
): string | undefined {
  return headers.find((h) => h.key === name)?.value;
}

describe("httpHeaders", () => {
  it("builds enforced app CSP with chart/runtime exceptions", () => {
    const headers = buildAppSecurityHeaders(false);
    const csp = headerValue(headers, "Content-Security-Policy");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(headerValue(headers, "Strict-Transport-Security")).toBeUndefined();
  });

  it("adds HSTS only in production app headers", () => {
    const prod = buildAppSecurityHeaders(true);
    expect(headerValue(prod, "Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    const dev = buildAppSecurityHeaders(false);
    expect(headerValue(dev, "Strict-Transport-Security")).toBeUndefined();
  });

  it("keeps baseline security headers on app routes", () => {
    const headers = buildAppSecurityHeaders(false);
    expect(headerValue(headers, "X-Frame-Options")).toBe("DENY");
    expect(headerValue(headers, "X-Content-Type-Options")).toBe("nosniff");
  });

  it("uses looser demo CSP for static marketing HTML", () => {
    const headers = buildDemoSecurityHeaders();
    const csp = headerValue(headers, "Content-Security-Policy");
    expect(csp).toContain("https://fonts.googleapis.com");
    expect(csp).not.toContain("'wasm-unsafe-eval'");
  });

  it("routes demo paths before catch-all", () => {
    const routes = buildSecurityHeaderRoutes(true);
    expect(routes[0]?.source).toBe("/animations/:path*");
    expect(routes[1]?.source).toBe("/brand/:path*");
    expect(routes[2]?.source).toBe("/:path*");
    expect(headerValue(routes[2]?.headers ?? [], "Strict-Transport-Security")).toBeDefined();
  });
});
