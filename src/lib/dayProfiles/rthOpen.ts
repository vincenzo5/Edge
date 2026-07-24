const NY_TIME_ZONE = "America/New_York";

function nyWallClockParts(atMs: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: NY_TIME_ZONE,
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
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  };
}

function matchesNyWallClock(
  atMs: number,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): boolean {
  const parts = nyWallClockParts(atMs);
  return (
    parts.year === year &&
    parts.month === month &&
    parts.day === day &&
    parts.hour === hour &&
    parts.minute === minute &&
    parts.second === 0
  );
}

/** RTH open (09:30 America/New_York) for an ISO session date YYYY-MM-DD. */
export function rthOpenMsForDate(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error(`Invalid session date: ${date}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // US equities RTH open is 09:30 ET; UTC offset is 4 or 5 hours depending on DST.
  for (let utcHour = 12; utcHour <= 16; utcHour += 1) {
    for (let utcMinute = 0; utcMinute < 60; utcMinute += 1) {
      const candidate = Date.UTC(year, month - 1, day, utcHour, utcMinute, 0);
      if (matchesNyWallClock(candidate, year, month, day, 9, 30)) {
        return candidate;
      }
    }
  }

  throw new Error(`Could not resolve RTH open for ${date}`);
}
