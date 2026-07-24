import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getTradingService,
  isTradingConfigured,
} from "@/lib/trading/tradingService";
import {
  tradingDisabledResponse,
  tradingErrorResponse,
} from "@/lib/trading/routeHelpers";
import { requireTradingMutateAuth } from "@/lib/trading/tradingMutateAuth";

export const runtime = "nodejs";

const ListPlaybooksQuerySchema = z.object({
  accountId: z.string().min(1),
  activeOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value !== "false"),
});

export async function GET(request: Request): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const auth = await requireTradingMutateAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = ListPlaybooksQuerySchema.safeParse({
    accountId: url.searchParams.get("accountId") ?? undefined,
    activeOnly: url.searchParams.get("activeOnly") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid playbook list query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const instances = await getTradingService().listPlaybookInstances(
      parsed.data.accountId,
      { activeOnly: parsed.data.activeOnly },
    );
    return NextResponse.json({ instances });
  } catch (error) {
    return tradingErrorResponse(error);
  }
}
