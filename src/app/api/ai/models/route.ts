import { isOpenRouterConfigured } from "@/lib/ai/model/openrouter";
import { fetchOpenRouterModelCatalog } from "@/lib/ai/model/openrouterModels";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  if (!isOpenRouterConfigured()) {
    return NextResponse.json(
      {
        error: "OPENROUTER_API_KEY is not configured",
        code: "missing_openrouter_key",
      },
      { status: 503 },
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY!.trim();
  const referer = process.env.EDGE_PUBLIC_APP_URL?.trim() || "https://edge.local";

  try {
    const catalog = await fetchOpenRouterModelCatalog(apiKey, referer);
    return NextResponse.json(catalog, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch models from OpenRouter" }, { status: 502 });
  }
}
