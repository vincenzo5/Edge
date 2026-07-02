import { NextResponse } from "next/server";
import { WhatIfRequestSchema } from "@/lib/marketData/contracts/brokerage";
import {
  brokerageDisabledResponse,
  brokerageErrorResponse,
} from "@/lib/brokerage/routeHelpers";
import {
  getBrokerageService,
  isBrokerageConfigured,
} from "@/lib/brokerage/brokerageService";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!isBrokerageConfigured()) return brokerageDisabledResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = WhatIfRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid what-if request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (parsed.data.orderType === "LMT" && parsed.data.limitPrice == null) {
    return NextResponse.json(
      { error: "limitPrice required for LMT orders" },
      { status: 400 },
    );
  }

  try {
    const result = await getBrokerageService().previewOrder(parsed.data);
    return NextResponse.json({ result });
  } catch (error) {
    return brokerageErrorResponse(error);
  }
}
