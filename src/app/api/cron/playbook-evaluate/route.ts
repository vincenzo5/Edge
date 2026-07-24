import "server-only";

import { NextResponse } from "next/server";

import { resolveCronUserId } from "@/lib/api/cronAuth";
import { isTradingConfigured } from "@/lib/trading/tradingService";
import { getTradingService } from "@/lib/trading/tradingService";
import {
  tradingDisabledResponse,
  tradingErrorResponse,
} from "@/lib/trading/routeHelpers";

export const runtime = "nodejs";

async function handleEvaluate(request: Request): Promise<Response> {
  if (!isTradingConfigured()) {
    return tradingDisabledResponse();
  }

  const userId = await resolveCronUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await getTradingService().evaluatePlaybooks();
    return NextResponse.json(result);
  } catch (error) {
    return tradingErrorResponse(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  return handleEvaluate(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleEvaluate(request);
}
