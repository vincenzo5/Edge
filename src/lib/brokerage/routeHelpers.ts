import { NextResponse } from "next/server";
import { jsonErrorResponse } from "@/lib/api/safeErrorResponse";
import { BrokerageRequestError } from "@/lib/brokerage/brokerageClient";

export function brokerageDisabledResponse(): Response {
  return NextResponse.json(
    {
      error: "Brokerage tracking unavailable",
      hint: "Start the TWS sidecar with IB Gateway running.",
    },
    { status: 503 },
  );
}

const DEGRADED_BROKERAGE_STATUSES = new Set<BrokerageRequestError["category"]>([
  "disabled",
  "gateway_disconnected",
  "sidecar_unreachable",
  "request_failed",
  "request_timeout",
]);

export function brokerageErrorResponse(error: unknown): Response {
  if (error instanceof BrokerageRequestError) {
    const status = DEGRADED_BROKERAGE_STATUSES.has(error.category) ? 503 : 500;
    return NextResponse.json(
      {
        error: error.message,
        category: error.category,
      },
      { status },
    );
  }
  return jsonErrorResponse(error, "Brokerage request failed", 500);
}
