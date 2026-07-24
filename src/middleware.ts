import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyApiKey } from "@/lib/api/apiAuth";
import { checkRateLimit } from "@/lib/api/rateLimit";
import {
  getRequestIdHeaderName,
  resolveRequestId,
} from "@/lib/observability/requestIdCore";

export const config = {
  matcher: ["/api/:path*"],
};

export function buildForwardRequestHeaders(request: NextRequest): Headers {
  const headerName = getRequestIdHeaderName();
  const requestId = resolveRequestId(request.headers);
  const headers = new Headers(request.headers);
  headers.set(headerName, requestId);
  return headers;
}

export function applyRequestIdHeader(response: Response, requestId: string): Response {
  response.headers.set(getRequestIdHeaderName(), requestId);
  return response;
}

export function evaluateApiMiddleware(request: NextRequest): Response | null {
  const pathname = request.nextUrl.pathname;

  const rate = checkRateLimit(request, pathname);
  if (!rate.ok) {
    return NextResponse.json(
      { error: rate.message },
      {
        status: rate.status,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  const auth = verifyApiKey(request, pathname);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  return null;
}

export function middleware(request: NextRequest) {
  const requestId = resolveRequestId(request.headers);
  const forwardHeaders = buildForwardRequestHeaders(request);

  const blocked = evaluateApiMiddleware(request);
  if (blocked) {
    return applyRequestIdHeader(blocked, requestId);
  }

  const response = NextResponse.next({
    request: { headers: forwardHeaders },
  });
  return applyRequestIdHeader(response, requestId);
}
