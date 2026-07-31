import { NextResponse } from "next/server";
import {
  getTradingService,
  isTradingConfigured,
} from "@/lib/trading/tradingService";
import {
  tradingDisabledResponse,
  tradingErrorResponse,
} from "@/lib/trading/routeHelpers";
import { requireTradingMutateAuth } from "@/lib/trading/tradingMutateAuth";
import { ClearPlannedBindingRequestSchema } from "@/lib/risk/policy/applyRequests";

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

  try {
    const instance = await getTradingService().applyRiskPolicyToBinding(body);
    return NextResponse.json({ instance });
  } catch (error) {
    return tradingErrorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const auth = await requireTradingMutateAuth(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ClearPlannedBindingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid clear binding request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const cleared = await getTradingService().clearPlannedBinding(parsed.data);
    return NextResponse.json({ cleared });
  } catch (error) {
    return tradingErrorResponse(error);
  }
}
