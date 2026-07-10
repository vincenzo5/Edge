import { NextResponse } from "next/server";
import { TradingEnvironmentSchema } from "@/lib/trading/types";
import {
  getTradingService,
  isTradingConfigured,
} from "@/lib/trading/tradingService";
import {
  tradingDisabledResponse,
  tradingErrorResponse,
} from "@/lib/trading/routeHelpers";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

function parseOrderRouteParams(
  request: Request,
  context: RouteContext,
): Promise<
  | {
      ok: true;
      orderId: number;
      accountId: string;
      intentId?: string;
      environment: "paper" | "live";
      liveConfirmation?: string;
    }
  | { ok: false; response: Response }
> {
  return context.params.then(async ({ orderId: rawOrderId }) => {
    const orderId = Number(rawOrderId);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Invalid orderId" }, { status: 400 }),
      };
    }

    const url = new URL(request.url);
    const accountId = url.searchParams.get("accountId")?.trim();
    if (!accountId) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "accountId query param required" },
          { status: 400 },
        ),
      };
    }

    const environmentParam = url.searchParams.get("environment") ?? "paper";
    const environment = TradingEnvironmentSchema.safeParse(environmentParam);
    if (!environment.success) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Invalid environment" }, { status: 400 }),
      };
    }

    const intentId = url.searchParams.get("intentId")?.trim() || undefined;
    const liveConfirmation = url.searchParams.get("liveConfirmation")?.trim() || undefined;
    return {
      ok: true,
      orderId,
      accountId,
      intentId,
      environment: environment.data,
      liveConfirmation,
    };
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const parsed = await parseOrderRouteParams(request, context);
  if (!parsed.ok) return parsed.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const liveConfirmation =
    (typeof body === "object" &&
      body != null &&
      "liveConfirmation" in body &&
      typeof (body as { liveConfirmation?: unknown }).liveConfirmation === "string"
      ? (body as { liveConfirmation: string }).liveConfirmation
      : undefined) ?? parsed.liveConfirmation;

  try {
    const result = await getTradingService().modifyOrder(
      parsed.accountId,
      parsed.orderId,
      body,
      parsed.intentId,
      parsed.environment,
      liveConfirmation,
    );
    return NextResponse.json(result);
  } catch (error) {
    return tradingErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const parsed = await parseOrderRouteParams(request, context);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await getTradingService().cancelOrder(
      parsed.accountId,
      parsed.orderId,
      parsed.intentId,
      parsed.environment,
      parsed.liveConfirmation,
    );
    return NextResponse.json(result);
  } catch (error) {
    return tradingErrorResponse(error);
  }
}
