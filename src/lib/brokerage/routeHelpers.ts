import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: error.message, category: error.category }, { status });
  }
  const message = error instanceof Error ? error.message : "Brokerage request failed";
  return NextResponse.json({ error: message }, { status: 500 });
}
