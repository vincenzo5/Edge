import { NextResponse } from "next/server";
import { jsonErrorResponse } from "@/lib/api/safeErrorResponse";
import { BrokerageRequestError } from "@/lib/brokerage/brokerageClient";
import { TradingValidationError, TradingKillSwitchError } from "./validateOrder";

export function tradingDisabledResponse(): Response {
  return NextResponse.json(
    {
      error: "Trading unavailable",
      hint: "Set TWS_READONLY=false and ensure IB Gateway paper (4002) or live (4001) is running.",
    },
    { status: 503 },
  );
}

const DEGRADED_TRADING_STATUSES = new Set<BrokerageRequestError["category"]>([
  "disabled",
  "gateway_disconnected",
  "sidecar_unreachable",
  "request_failed",
  "request_timeout",
]);

export function tradingErrorResponse(error: unknown): Response {
  if (error instanceof TradingKillSwitchError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof TradingValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof BrokerageRequestError) {
    const status = DEGRADED_TRADING_STATUSES.has(error.category) ? 503 : 500;
    return NextResponse.json(
      {
        error: error.message,
        category: error.category,
      },
      { status },
    );
  }
  return jsonErrorResponse(error, "Trading request failed", 500);
}
