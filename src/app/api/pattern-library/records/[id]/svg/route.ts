import { NextResponse } from "next/server";

import { parsePatternId } from "@/lib/patternLibrary/types";
import { resolvePatternLibraryStoreForRequest } from "@/lib/patternLibrary/patternLibraryStore";
import {
  patternLibraryAuthResponse,
  patternLibraryInvalidIdResponse,
} from "@/lib/patternLibrary/routeErrors";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    parsePatternId(id);
    const store = await resolvePatternLibraryStoreForRequest();
    const svg = await store.readRecordSvg(id);
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
  } catch (error) {
    const auth = patternLibraryAuthResponse(error);
    if (auth) return auth;
    const invalid = patternLibraryInvalidIdResponse(error);
    if (invalid) return invalid;
    return NextResponse.json({ error: "Invalid pattern id" }, { status: 400 });
  }
}
