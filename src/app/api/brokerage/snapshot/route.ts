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

/** Aggregated account snapshot for poll fallback and initial panel load. */
export async function GET(): Promise<Response> {
  if (!isBrokerageConfigured()) return brokerageDisabledResponse();
  try {
    const snapshot = await getBrokerageService().getSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    return brokerageErrorResponse(error);
  }
}
