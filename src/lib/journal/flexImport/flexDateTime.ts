/** IB Flex `YYYYMMDD;HHMMSS` wall clocks are America/New_York (EST/EDT). */

export const FLEX_FILL_TIME_ZONE = "America/New_York";

type WallParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function wallPartsInTimeZone(atMs: number, timeZone: string): WallParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(atMs));

  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") lookup[part.type] = part.value;
  }

  let hour = Number(lookup.hour);
  // Some engines emit "24" for midnight.
  if (hour === 24) hour = 0;

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour,
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  };
}

function wallPartsEqual(a: WallParts, b: WallParts): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hour === b.hour &&
    a.minute === b.minute &&
    a.second === b.second
  );
}

/**
 * Convert a civil wall-clock time in `timeZone` to a UTC ISO string.
 * Uses Intl offset probing (no extra timezone dependency).
 */
export function zonedWallTimeToUtcIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string = FLEX_FILL_TIME_ZONE,
): string {
  const wanted: WallParts = { year, month, day, hour, minute, second };
  // Initial guess: treat wall components as UTC, then correct by zone offset.
  let guess = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i += 1) {
    const actual = wallPartsInTimeZone(guess, timeZone);
    if (wallPartsEqual(actual, wanted)) {
      return new Date(guess).toISOString();
    }
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const wantedAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    guess += wantedAsUtc - actualAsUtc;
  }

  // Fallback: minute scan around the guess (DST transition edges).
  for (let deltaMin = -150; deltaMin <= 150; deltaMin += 1) {
    const candidate = Date.UTC(year, month - 1, day, hour, minute, second) + deltaMin * 60_000;
    if (wallPartsEqual(wallPartsInTimeZone(candidate, timeZone), wanted)) {
      return new Date(candidate).toISOString();
    }
  }

  return new Date(guess).toISOString();
}

/** Parse Flex `YYYYMMDD;HHMMSS` as America/New_York → UTC ISO. */
export function flexDateTimeToUtcIso(raw: string): string | null {
  const match = raw.trim().match(/^(\d{4})(\d{2})(\d{2});(\d{2})(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return zonedWallTimeToUtcIso(
    Number(year),
    Number(month),
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    FLEX_FILL_TIME_ZONE,
  );
}

/**
 * Reinterpret a timestamp whose UTC clock digits were wrongly stored from an
 * Eastern wall clock (UTC-container Flex import bug) as true UTC.
 */
export function reinterpretUtcComponentsAsEastern(storedIso: string): string {
  const date = new Date(storedIso);
  if (!Number.isFinite(date.getTime())) return storedIso;
  return zonedWallTimeToUtcIso(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    FLEX_FILL_TIME_ZONE,
  );
}
