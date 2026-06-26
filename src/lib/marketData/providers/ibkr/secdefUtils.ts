import type { IbkrSecdefSearchRow } from "./client";

/** Pick secdef row with OPT months for options workflows. */
export function findOptionsSecdefRow(rows: IbkrSecdefSearchRow[]): IbkrSecdefSearchRow | null {
  for (const row of rows) {
    const opt = row.sections?.find((s) => s.secType === "OPT" && s.months?.trim());
    if (opt) return row;
  }
  return null;
}

/** Extract month tokens from the row that has OPT section. */
export function extractOptionMonthsFromSecdef(rows: IbkrSecdefSearchRow[]): string[] {
  const row = findOptionsSecdefRow(rows);
  const optSection = row?.sections?.find((s) => s.secType === "OPT");
  if (!optSection?.months) return [];
  return optSection.months
    .split(";")
    .map((m) => m.trim())
    .filter(Boolean);
}
