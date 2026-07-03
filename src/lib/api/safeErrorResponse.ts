import "server-only";

import { NextResponse } from "next/server";

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

export function toPublicErrorMessage(error: unknown, fallback: string): string {
  const detail = error instanceof Error ? error.message : fallback;
  if (isProductionEnvironment()) {
    console.error("[api]", detail, error);
    return fallback;
  }
  console.error("[api]", detail, error);
  return detail || fallback;
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
