import { NextResponse } from "next/server";
import { readTradingEnvironmentLock } from "@/lib/trading/validateOrder";

export const runtime = "nodejs";

/** Public trading process knobs for client UI pinning. */
export async function GET(): Promise<Response> {
  try {
    return NextResponse.json({ environmentLock: readTradingEnvironmentLock() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid trading config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
