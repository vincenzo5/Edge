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

async function handleInstanceAction(
  request: Request,
  context: RouteContext,
  action: "pause" | "resume" | "skip",
): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const auth = await requireTradingMutateAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Playbook instance id required" }, { status: 400 });
  }

  try {
    const service = getTradingService();
    const instanceId = id.trim();
    const instance =
      action === "pause"
        ? await service.pausePlaybookInstance(instanceId)
        : action === "resume"
          ? await service.resumePlaybookInstance(instanceId)
          : await service.skipNextPlaybookRule(instanceId);

    if (!instance) {
      return NextResponse.json({ error: "Playbook instance not found" }, { status: 404 });
    }
    return NextResponse.json({ instance });
  } catch (error) {
    return tradingErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return handleInstanceAction(request, context, "pause");
}
