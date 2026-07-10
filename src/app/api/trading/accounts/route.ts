import { NextResponse } from "next/server";
import { resolveTradingAccountId } from "@/lib/trading/activeAccount";
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

export async function GET(request: Request): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const url = new URL(request.url);
  const environmentParam = url.searchParams.get("environment");
  const environment = environmentParam
    ? TradingEnvironmentSchema.safeParse(environmentParam)
    : null;
  if (environmentParam && !environment?.success) {
    return NextResponse.json({ error: "Invalid environment" }, { status: 400 });
  }

  try {
    const accounts = await getTradingService().listAccounts(
      environment?.success ? environment.data : undefined,
    );
    const defaultAccountId = resolveTradingAccountId(accounts);
    return NextResponse.json({ accounts, defaultAccountId });
  } catch (error) {
    return tradingErrorResponse(error);
  }
}
