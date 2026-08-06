import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getTradingService,
  isTradingConfigured,
} from "@/lib/trading/tradingService";
import {
  tradingDisabledResponse,
  tradingErrorResponse,
} from "@/lib/trading/routeHelpers";
import { requireTradingMutateAuth } from "@/lib/trading/tradingMutateAuth";
import { TradingEnvironmentSchema } from "@/lib/trading/types";

export const runtime = "nodejs";

const KillFlattenBodySchema = z.object({
  environment: TradingEnvironmentSchema,
  liveConfirmation: z.string().optional(),
});

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

  const parsed = KillFlattenBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid kill-flatten request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await getTradingService().killAndFlattenEnvironment(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return tradingErrorResponse(error);
  }
}
