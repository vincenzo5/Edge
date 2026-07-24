import { NextResponse } from "next/server";

import {
  getTradingService,
  isTradingConfigured,
} from "@/lib/trading/tradingService";
import {
  tradingDisabledResponse,
  tradingErrorResponse,
} from "@/lib/trading/routeHelpers";
import { requireTradingMutateAuth } from "@/lib/trading/tradingMutateAuth";
import { PLAYBOOK_PRESET_LIST } from "@/lib/trading/playbook/presets";
import { CreatePlaybookTemplateSchema } from "@/lib/trading/playbookTemplateStore";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const auth = await requireTradingMutateAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const userTemplates = await getTradingService().listPlaybookTemplates();
    return NextResponse.json({
      presets: PLAYBOOK_PRESET_LIST,
      userTemplates,
    });
  } catch (error) {
    return tradingErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const auth = await requireTradingMutateAuth(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreatePlaybookTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid template create body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const template = await getTradingService().createPlaybookTemplate(parsed.data);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return tradingErrorResponse(error);
  }
}
