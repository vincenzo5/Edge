import { NextResponse } from "next/server";

import { PatternLibraryAuthRequiredError } from "@/lib/patternLibrary/patternLibraryStore";

export function patternLibraryAuthResponse(error: unknown): NextResponse | null {
  if (error instanceof PatternLibraryAuthRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  return null;
}

export function patternLibraryInvalidIdResponse(error: unknown): NextResponse | null {
  if (error instanceof Error && error.message.includes("Invalid pattern id")) {
    return NextResponse.json({ error: "Invalid pattern id" }, { status: 400 });
  }
  return null;
}
