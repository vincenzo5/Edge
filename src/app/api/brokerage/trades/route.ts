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

export async function GET(): Promise<Response> {
  if (!isBrokerageConfigured()) return brokerageDisabledResponse();
  try {
    const client = getBrokerageService().getClient();
    if (!client) return brokerageDisabledResponse();
    const result = await client.getTrades();
    return NextResponse.json(result);
  } catch (error) {
    return brokerageErrorResponse(error);
  }
}
