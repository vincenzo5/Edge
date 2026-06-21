import { NextResponse } from "next/server";
import { searchSymbols } from "@/lib/yahoo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { query?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query : "";
  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchSymbols(query);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
