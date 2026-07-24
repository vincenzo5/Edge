import { NextResponse } from "next/server";

import { filterDayProfiles } from "@/lib/dayProfiles/filter";
import { loadConfirmedDayProfiles } from "@/lib/dayProfiles/load";
import { dayProfileQuerySchema } from "@/lib/dayProfiles/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQuery = Object.fromEntries(url.searchParams.entries());
  const parsed = dayProfileQuerySchema.safeParse(rawQuery);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const filters = {
    ...parsed.data,
    status: parsed.data.status ?? ("confirmed" as const),
  };

  const profiles = filterDayProfiles(loadConfirmedDayProfiles(), filters);
  return NextResponse.json({ ok: true, profiles });
}
