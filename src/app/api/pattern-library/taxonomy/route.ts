import { NextResponse } from "next/server";
import { loadTaxonomy } from "@/lib/patternLibrary/storage";

export const runtime = "nodejs";

export async function GET() {
  const taxonomy = loadTaxonomy();
  return NextResponse.json({
    ok: true,
    setupFamilies: taxonomy.setupFamilies.map((family) => ({
      id: family.id,
      name: family.name,
    })),
  });
}
