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
import { PatchPlaybookTemplateSchema } from "@/lib/trading/playbookTemplateStore";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const auth = await requireTradingMutateAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PatchPlaybookTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid template patch body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const template = await getTradingService().patchPlaybookTemplate(id, parsed.data);
    if (!template) {
      return NextResponse.json({ error: "Template not found or not editable" }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (error) {
    return tradingErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isTradingConfigured()) return tradingDisabledResponse();

  const auth = await requireTradingMutateAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const deleted = await getTradingService().deletePlaybookTemplate(id);
    if (!deleted) {
      return NextResponse.json({ error: "Template not found or not deletable" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return tradingErrorResponse(error);
  }
}
