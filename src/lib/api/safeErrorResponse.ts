import "server-only";

import { NextResponse } from "next/server";
import { redactDiagnostic } from "./redactDiagnostic";
import { appendLocalError } from "@/lib/observability/localErrorLog";

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

export function toPublicErrorMessage(error: unknown, fallback: string): string {
  const safeFallback = redactDiagnostic(fallback) || "Request failed";
  const detail = redactDiagnostic(error instanceof Error ? error.message : safeFallback);
  appendLocalError({
    source: "api",
    message: detail || safeFallback,
    stack: error instanceof Error ? error.stack : undefined,
  });
  if (isProductionEnvironment()) {
    console.error("[api]", safeFallback);
    return safeFallback;
  }
  console.error("[api]", detail);
  return detail || safeFallback;
}

export function jsonErrorResponse(
  error: unknown,
  fallback: string,
  status = 500,
): Response {
  return NextResponse.json(
    { error: toPublicErrorMessage(error, fallback) },
    { status },
  );
}
