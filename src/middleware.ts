import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyApiKey } from "@/lib/api/apiAuth";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const config = {
  matcher: ["/api/:path*"],
};

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
  const blocked = evaluateApiMiddleware(request);
  if (blocked) {
    return blocked;
  }
  return NextResponse.next();
}
