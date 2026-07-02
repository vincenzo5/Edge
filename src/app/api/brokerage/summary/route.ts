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
    const summary = await client.getSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    return brokerageErrorResponse(error);
  }
}
