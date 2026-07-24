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
import { PatchPlaybookAutoManageSchema } from "@/lib/trading/playbookAutoManageStore";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const auth = await requireTradingMutateAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const settings = await getTradingService().getPlaybookAutoManageSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return tradingErrorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const auth = await requireTradingMutateAuth(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PatchPlaybookAutoManageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid auto-manage patch", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const settings = await getTradingService().patchPlaybookAutoManageSettings(parsed.data);
    return NextResponse.json({ settings });
  } catch (error) {
    return tradingErrorResponse(error);
  }
}
