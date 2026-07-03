import { NextResponse } from "next/server";
import { jsonErrorResponse, toPublicErrorMessage } from "@/lib/api/safeErrorResponse";
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

export function brokerageErrorResponse(error: unknown): Response {
  if (error instanceof BrokerageRequestError) {
    const status =
      error.category === "disabled"
        ? 503
        : error.category === "gateway_disconnected"
          ? 503
          : error.category === "sidecar_unreachable"
            ? 503
            : 500;
    return NextResponse.json(
      {
        error: toPublicErrorMessage(error, "Brokerage request failed"),
        category: error.category,
      },
      { status },
    );
  }
  return jsonErrorResponse(error, "Brokerage request failed", 500);
}
