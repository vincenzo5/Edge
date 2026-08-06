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
import { RiskPolicyOffReasonSchema } from "@/lib/risk/policy/slotSchemas";

export const runtime = "nodejs";

const ExitCleanupBodySchema = z.object({
  liveConfirmation: z.string().optional(),
  reason: RiskPolicyOffReasonSchema.optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const auth = await requireTradingMutateAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Playbook instance id required" }, { status: 400 });
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ExitCleanupBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid exit-cleanup request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await getTradingService().exitAndCleanup({
      instanceId: id.trim(),
      liveConfirmation: parsed.data.liveConfirmation,
      reason: parsed.data.reason,
    });
    return NextResponse.json(result);
  } catch (error) {
    return tradingErrorResponse(error);
  }
}
