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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const auth = await requireTradingMutateAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const template = await getTradingService().duplicatePlaybookTemplate(id);
    if (!template) {
      return NextResponse.json({ error: "Source template not found" }, { status: 404 });
    }
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return tradingErrorResponse(error);
  }
}
