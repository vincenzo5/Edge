import { NextResponse } from "next/server";
import { SubmitBracketRequestSchema } from "@/lib/trading/types";
import {
  getTradingService,
  isTradingConfigured,
  TradingReadinessBlockedError,
} from "@/lib/trading/tradingService";
import {
  tradingDisabledResponse,
  tradingErrorResponse,
} from "@/lib/trading/routeHelpers";
import { requireTradingMutateAuth } from "@/lib/trading/tradingMutateAuth";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const auth = await requireTradingMutateAuth(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SubmitBracketRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid bracket submit request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const playbookAttach =
      parsed.data.playbookTemplateId &&
      parsed.data.playbookEntryPrice != null &&
      parsed.data.playbookInitialStop != null
        ? {
            templateId: parsed.data.playbookTemplateId,
            entryPrice: parsed.data.playbookEntryPrice,
            initialStop: parsed.data.playbookInitialStop,
            notifyAtManageLevels: parsed.data.playbookNotifyAtManageLevels,
          }
        : undefined;

    const result = await getTradingService().submitBracket(
      parsed.data.plan,
      parsed.data.idempotencyKey,
      parsed.data.previewIntentId,
      parsed.data.liveConfirmation,
      playbookAttach,
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
