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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const auth = await requireTradingMutateAuth(_request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Playbook instance id required" }, { status: 400 });
  }

  try {
    const instance = await getTradingService().detachPlaybookInstance(id.trim());
    if (!instance) {
      return NextResponse.json({ error: "Playbook instance not found" }, { status: 404 });
    }
    return NextResponse.json({ instance });
  } catch (error) {
    return tradingErrorResponse(error);
  }
}
