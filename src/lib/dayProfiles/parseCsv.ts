import {
  CATALYST_TYPE,
  DAY_PROFILE_STATUS,
  DAY_TYPE,
  GAP_TYPE,
  OPEN_TYPE,
  PARTICIPATION_TYPE,
  RELATIVE_TYPE,
  VOLATILITY_TYPE,
  type DayProfile,
  type DayProfileUniverse,
} from "./types";

const CSV_HEADERS = [
  "symbol",
  "date",
  "universe",
  "dayTypeHint",
  "openType",
  "gap",
  "volatility",
  "participation",
  "catalyst",
  "relative",
  "gapPct",
  "rangeAtr",
  "rvol",
  "closeLoc",
  "retPct",
  "spyRetPct",
  "status",
  "notes",
] as const;

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function parseNumber(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const num = Number(raw.trim());
  return Number.isFinite(num) ? num : null;
}

function parseEnum<T extends readonly string[]>(
  value: string,
  allowed: T,
  fallback: T[number],
): T[number] {
  return (allowed as readonly string[]).includes(value) ? (value as T[number]) : fallback;
}

function rowToProfile(cells: string[]): DayProfile | null {
  if (cells.length < CSV_HEADERS.length) return null;

  const [
    symbol,
    date,
    universeRaw,
    dayTypeHint,
    openTypeRaw,
    gapRaw,
    volatilityRaw,
    participationRaw,
    catalystRaw,
    relativeRaw,
    gapPctRaw,
    rangeAtrRaw,
    rvolRaw,
    closeLocRaw,
    retPctRaw,
    spyRetPctRaw,
    statusRaw,
    notes,
  ] = cells;

  if (!symbol?.trim() || !date?.trim()) return null;

  const universe = parseEnum(universeRaw ?? "", ["tape_index", "sector", "single_name"], "single_name") as DayProfileUniverse;
  const catalyst = catalystRaw?.trim()
    ? parseEnum(catalystRaw, CATALYST_TYPE, "catalyst_none")
    : "";
  const relative = relativeRaw?.trim()
    ? parseEnum(relativeRaw, RELATIVE_TYPE, "idiosyncratic")
    : "";

  return {
    symbol: symbol.trim().toUpperCase(),
    date: date.trim(),
    universe,
    dayType: parseEnum(dayTypeHint ?? "", DAY_TYPE, "unknown"),
    openType: parseEnum(openTypeRaw ?? "", OPEN_TYPE, "open_unknown"),
    gap: parseEnum(gapRaw ?? "", GAP_TYPE, "gap_none"),
    volatility: parseEnum(volatilityRaw ?? "", VOLATILITY_TYPE, "vol_normal"),
    participation: parseEnum(participationRaw ?? "", PARTICIPATION_TYPE, "rvol_normal"),
    catalyst,
    relative,
    gapPct: parseNumber(gapPctRaw),
    rangeAtr: parseNumber(rangeAtrRaw),
    rvol: parseNumber(rvolRaw),
    closeLoc: parseNumber(closeLocRaw),
    retPct: parseNumber(retPctRaw),
    spyRetPct: parseNumber(spyRetPctRaw),
    status: parseEnum(statusRaw ?? "", DAY_PROFILE_STATUS, "proposed"),
    notes: notes ?? "",
  };
}

export function parseDayProfilesCsv(content: string): DayProfile[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]!);
  if (header[0] !== "symbol") {
    throw new Error("Invalid day profiles CSV: missing symbol header");
  }

  const profiles: DayProfile[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const profile = rowToProfile(parseCsvLine(lines[i]!));
    if (profile) profiles.push(profile);
  }
  return profiles;
}
