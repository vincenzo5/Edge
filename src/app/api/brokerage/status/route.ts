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
    const service = getBrokerageService();
    const status = await service.getStatus();
    return NextResponse.json({ status });
  } catch (error) {
    return brokerageErrorResponse(error);
  }
}
