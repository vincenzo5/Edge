import { NextResponse } from "next/server";
import { SubmitOrderRequestSchema } from "@/lib/trading/types";
import {
  getTradingService,
  isTradingConfigured,
  TradingReadinessBlockedError,
} from "@/lib/trading/tradingService";
import {
  tradingDisabledResponse,
  tradingErrorResponse,
} from "@/lib/trading/routeHelpers";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SubmitOrderRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submit request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await getTradingService().submitOrder(
      parsed.data.draft,
      parsed.data.idempotencyKey,
      parsed.data.previewIntentId,
      parsed.data.liveConfirmation,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TradingReadinessBlockedError) {
      return NextResponse.json(
        { error: "Trading readiness blocked", reasons: error.reasons },
        { status: 409 },
      );
    }
    return tradingErrorResponse(error);
  }
}
