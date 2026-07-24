import { NextResponse } from "next/server";

import { isTrustedLocalhost, verifyConfiguredApiKey } from "@/lib/api/apiAuth";
import type { ClientIpSource } from "@/lib/api/clientIp";

export function assertLocalErrorsAccess(
  request: ClientIpSource,
): Response | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (isTrustedLocalhost(request)) {
    return null;
  }

  const keyResult = verifyConfiguredApiKey(request);
  if (keyResult.ok) {
    return null;
  }

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
