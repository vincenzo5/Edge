import { describe, expect, it } from "vitest";

import { filterDayProfiles } from "./filter";
import { parseDayProfilesCsv } from "./parseCsv";
import { rthOpenMsForDate } from "./rthOpen";
import type { DayProfile } from "./types";

const SAMPLE_CSV = `symbol,date,universe,dayTypeHint,openType,gap,volatility,participation,catalyst,relative,gapPct,rangeAtr,rvol,closeLoc,retPct,spyRetPct,status,notes
AAPL,2026-07-15,single_name,trend,open_drive,gap_and_go,vol_normal,rvol_high,,leader,1.2,1.1,1.4,0.8,2.1,0.5,confirmed,sample
SPY,2026-07-17,tape_index,neutral,open_auction,gap_and_go,vol_normal,rvol_normal,,,-1.1,0.8,1.1,0.4,-1.0,-1.0,confirmed,sample
NVDA,2026-07-10,single_name,trend,open_drive,gap_and_fade,vol_expand,rvol_high,,laggard,-2.0,1.5,1.6,0.6,-1.5,-0.8,proposed,pending
`;

function profile(overrides: Partial<DayProfile>): DayProfile {
  return {
    symbol: "AAPL",
    date: "2026-07-15",
    universe: "single_name",
    dayType: "trend",
    openType: "open_drive",
    gap: "gap_and_go",
    volatility: "vol_normal",
    participation: "rvol_high",
    catalyst: "",
    relative: "leader",
    gapPct: 1.2,
    rangeAtr: 1.1,
    rvol: 1.4,
    closeLoc: 0.8,
    retPct: 2.1,
    spyRetPct: 0.5,
    status: "confirmed",
    notes: "",
    ...overrides,
  };
}

describe("parseDayProfilesCsv", () => {
  it("parses rows and maps dayTypeHint to dayType", () => {
    const profiles = parseDayProfilesCsv(SAMPLE_CSV);
    expect(profiles).toHaveLength(3);
    expect(profiles[0]).toMatchObject({
      symbol: "AAPL",
      dayType: "trend",
      openType: "open_drive",
      status: "confirmed",
    });
  });
});

describe("filterDayProfiles", () => {
  const profiles = parseDayProfilesCsv(SAMPLE_CSV);

  it("defaults to confirmed status", () => {
    expect(filterDayProfiles(profiles, {})).toHaveLength(2);
  });

  it("ANDs multiple layer filters", () => {
    expect(
      filterDayProfiles(profiles, {
        dayType: "trend",
        openType: "open_drive",
      }),
    ).toEqual([profiles[0]]);
  });

  it("filters by symbol case-insensitively", () => {
    expect(filterDayProfiles(profiles, { symbol: "spy" })).toEqual([profiles[1]]);
  });

  it("filters by relative when set", () => {
    expect(filterDayProfiles([profile({ relative: "leader" })], { relative: "leader" })).toHaveLength(1);
    expect(filterDayProfiles([profile({ relative: "" })], { relative: "leader" })).toHaveLength(0);
  });
});

describe("rthOpenMsForDate", () => {
  it("returns 09:30 America/New_York for a summer session", () => {
    const atMs = rthOpenMsForDate("2026-07-15");
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(atMs));
    const hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;
    expect(hour).toBe("09");
    expect(minute).toBe("30");
  });

  it("rejects invalid dates", () => {
    expect(() => rthOpenMsForDate("bad-date")).toThrow(/Invalid session date/);
  });
});
