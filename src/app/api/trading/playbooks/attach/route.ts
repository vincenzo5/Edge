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

  const payload =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const liveConfirmation =
    typeof payload.liveConfirmation === "string" ? payload.liveConfirmation : undefined;

  try {
    const instance = await getTradingService().attachManagementPlaybook(
      body,
      liveConfirmation,
    );
    return NextResponse.json({ instance });
  } catch (error) {
    return tradingErrorResponse(error);
  }
}
