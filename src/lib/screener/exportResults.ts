import type { ScreenerColumnId, ScreenerResultRow } from "./types";
import { SCREENER_COLUMN_LABELS } from "./types";

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatExportCell(column: ScreenerColumnId, row: ScreenerResultRow): string {
  switch (column) {
    case "symbol":
      return row.symbol;
    case "name":
      return row.name ?? "";
    case "price":
      return row.price == null ? "" : String(row.price);
    case "change":
      return row.change == null ? "" : String(row.change);
    case "changePercent":
      return row.changePercent == null ? "" : String(row.changePercent);
    case "volume":
      return row.volume == null ? "" : String(row.volume);
    case "sector":
      return row.sector ?? "";
    case "industry":
      return row.industry ?? "";
    case "country":
      return row.country ?? "";
    case "marketCap":
      return row.marketCap == null ? "" : String(row.marketCap);
    case "dividendYield":
      return row.dividendYield == null ? "" : String(row.dividendYield);
    case "beta":
      return row.beta == null ? "" : String(row.beta);
    default:
      return "";
  }
}

export function buildResultsCsv(
  rows: ScreenerResultRow[],
  columns: ScreenerColumnId[],
): string {
  const header = columns.map((column) => escapeCsvCell(SCREENER_COLUMN_LABELS[column])).join(",");
  const body = rows
    .map((row) =>
      columns.map((column) => escapeCsvCell(formatExportCell(column, row))).join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function downloadResultsCsv(
  rows: ScreenerResultRow[],
  columns: ScreenerColumnId[],
  filename = "screener-results.csv",
): void {
  const csv = buildResultsCsv(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildSymbolsClipboardText(rows: ScreenerResultRow[]): string {
  return rows.map((row) => row.symbol.trim().toUpperCase()).join("\n");
}

export async function copySymbolsToClipboard(rows: ScreenerResultRow[]): Promise<boolean> {
  const text = buildSymbolsClipboardText(rows);
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}
