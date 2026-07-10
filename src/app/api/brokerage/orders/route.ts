import { NextResponse } from "next/server";
import {
  brokerageDisabledResponse,
  brokerageErrorResponse,
} from "@/lib/brokerage/routeHelpers";
import {
  getBrokerageService,
  isBrokerageConfigured,
} from "@/lib/brokerage/brokerageService";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  if (!isBrokerageConfigured()) return brokerageDisabledResponse();
  try {
    const client = getBrokerageService().getClient();
    if (!client) return brokerageDisabledResponse();
    const accountId = new URL(request.url).searchParams.get("accountId")?.trim();
    const result = await client.getOrders(
      accountId ? { accountId } : undefined,
    );
    return NextResponse.json(result);
  } catch (error) {
    return brokerageErrorResponse(error);
  }
}
