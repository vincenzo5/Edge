import { rthOpenMsForDate } from "@/lib/dayProfiles/rthOpen";

import type { EntrySchedule } from "./slotSchemas";

const NY_TIME_ZONE = "America/New_York";
const RTH_CLOSE_HOUR = 16;
const RTH_CLOSE_MINUTE = 0;

function nySessionDateParts(atMs: number): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: NY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(atMs));

  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") lookup[part.type] = part.value;
  }
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
  };
}

function formatSessionDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addCalendarDays(year: number, month: number, day: number, delta: number): string {
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return formatSessionDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function rthCloseMsForDate(date: string): number {
  const openMs = rthOpenMsForDate(date);
  // RTH close is 6.5 hours after open (09:30 → 16:00 ET).
  return openMs + (RTH_CLOSE_HOUR - 9) * 60 * 60 * 1000 + (RTH_CLOSE_MINUTE - 30) * 60 * 1000;
}

function nextWeekdaySessionDate(fromMs: number): string {
  const { year, month, day } = nySessionDateParts(fromMs);
  let cursor = formatSessionDate(year, month, day);
  for (let i = 0; i < 7; i += 1) {
    const probe = addCalendarDays(year, month, day, i);
    const dayOfWeek = new Date(`${probe}T12:00:00.000Z`).getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      cursor = probe;
      break;
    }
  }
  return cursor;
}

function resolveSessionEventFireAt(
  event: "nextRthOpen" | "nextRthClose",
  now: Date,
): string | null {
  const nowMs = now.getTime();
  const sessionDate = nextWeekdaySessionDate(nowMs);
  const fireMs =
    event === "nextRthOpen" ? rthOpenMsForDate(sessionDate) : rthCloseMsForDate(sessionDate);

  if (fireMs <= nowMs) {
    const { year, month, day } = nySessionDateParts(nowMs);
    const nextDate = addCalendarDays(year, month, day, 1);
    const nextFireMs =
      event === "nextRthOpen" ? rthOpenMsForDate(nextDate) : rthCloseMsForDate(nextDate);
    return new Date(nextFireMs).toISOString();
  }

  return new Date(fireMs).toISOString();
}

/** Resolve authoritative fire time for an EntrySchedule. Immediate returns null. */
export function resolveEntryScheduleFireAt(
  schedule: EntrySchedule,
  now: Date = new Date(),
): string | null {
  if (schedule.kind === "immediate") {
    return null;
  }
  if (schedule.kind === "clock") {
    return schedule.at;
  }
  return resolveSessionEventFireAt(schedule.event, now);
}
