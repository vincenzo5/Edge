import { NextResponse } from "next/server";
import { readRecordSvg } from "@/lib/patternLibrary/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const svg = readRecordSvg(id);
  if (!svg) {
    return NextResponse.json({ error: "SVG not found" }, { status: 404 });
  }
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=60",
    },
  });
}
