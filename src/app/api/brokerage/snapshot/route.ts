import { NextResponse } from "next/server";
import {
  brokerageDisabledResponse,
  brokerageErrorResponse,
} from "@/lib/brokerage/routeHelpers";
import {
  getBrokerageService,
  isBrokerageConfigured,
} from "@/lib/brokerage/brokerageService";
import { TradingEnvironmentSchema } from "@/lib/trading/types";

export const runtime = "nodejs";

/** Aggregated account snapshot for poll fallback and initial panel load. */
export async function GET(request: Request): Promise<Response> {
  if (!isBrokerageConfigured()) return brokerageDisabledResponse();

  const url = new URL(request.url);
  const environmentParam = url.searchParams.get("environment") ?? "paper";
  const environment = TradingEnvironmentSchema.safeParse(environmentParam);
  if (!environment.success) {
    return NextResponse.json({ error: "Invalid environment" }, { status: 400 });
  }

  try {
    const snapshot = await getBrokerageService().getSnapshot(environment.data);
    return NextResponse.json(snapshot);
  } catch (error) {
    return brokerageErrorResponse(error);
  }
}
