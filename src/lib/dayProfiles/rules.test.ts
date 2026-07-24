import { describe, expect, it } from "vitest";

import {
  classifyDayHint,
  classifyGap,
  classifyRelative,
  classifyRvol,
  classifyVol,
  type OhlcBar,
} from "./rules";
import { classifyOpenType, rthBars } from "./rulesOpen";

function bar(
  open: number,
  high: number,
  low: number,
  close: number,
  tsSec = 1_700_000_000,
): OhlcBar {
  return { timestamp: tsSec, open, high, low, close };
}

/** Build N ascending 5m bars starting at 09:30 ET on 2026-07-15 (EDT = UTC-4). */
function rthWindowBars(
  specs: Array<{ open: number; high: number; low: number; close: number }>,
  date = "2026-07-15",
): OhlcBar[] {
  const [y, m, d] = date.split("-").map(Number);
  const baseUtcMs = Date.UTC(y!, m! - 1, d!, 13, 30, 0);
  return specs.map((s, i) => ({
    timestamp: Math.floor((baseUtcMs + i * 5 * 60 * 1000) / 1000),
    ...s,
  }));
}

describe("classifyGap", () => {
  it("returns gap_none for tiny gaps", () => {
    expect(classifyGap(0.001, 100, 101, 99, 100.5, 100)).toBe("gap_none");
  });

  it("classifies gap up and go", () => {
    expect(classifyGap(0.01, 101, 103, 100.5, 102, 100)).toBe("gap_and_go");
  });

  it("classifies gap up fade", () => {
    expect(classifyGap(0.01, 101, 101.5, 99, 99.5, 100)).toBe("gap_and_fade");
  });

  it("classifies gap up partial fill", () => {
    expect(classifyGap(0.01, 101, 102, 99.5, 101.5, 100)).toBe("gap_partial");
  });

  it("classifies gap down and go", () => {
    expect(classifyGap(-0.01, 99, 99.5, 98, 98.5, 100)).toBe("gap_and_go");
  });
});

describe("classifyVol", () => {
  it("maps range/ATR thresholds", () => {
    expect(classifyVol(2.1)).toBe("vol_climax");
    expect(classifyVol(1.4)).toBe("vol_expand");
    expect(classifyVol(0.5)).toBe("vol_contract");
    expect(classifyVol(1.0)).toBe("vol_normal");
  });
});

describe("classifyRvol", () => {
  it("maps relative volume thresholds", () => {
    expect(classifyRvol(2.0)).toBe("rvol_high");
    expect(classifyRvol(0.5)).toBe("rvol_low");
    expect(classifyRvol(1.0)).toBe("rvol_normal");
  });
});

describe("classifyRelative", () => {
  it("maps excess return vs SPY", () => {
    expect(classifyRelative(0.01, 0.008)).toBe("beta_proxy");
    expect(classifyRelative(0.02, 0.005)).toBe("leader");
    expect(classifyRelative(-0.01, 0.005)).toBe("laggard");
    expect(classifyRelative(0.011, 0.007)).toBe("idiosyncratic");
  });
});

describe("classifyDayHint", () => {
  it("maps close location and range/ATR", () => {
    expect(classifyDayHint(0.5, 0.6)).toBe("non_trend");
    expect(classifyDayHint(0.85, 1.3)).toBe("trend");
    expect(classifyDayHint(0.5, 1.0)).toBe("neutral");
    expect(classifyDayHint(0.7, 1.0)).toBe("normal");
  });
});

describe("classifyOpenType", () => {
  it("returns open_unknown for thin data", () => {
    expect(classifyOpenType([])).toBe("open_unknown");
    expect(classifyOpenType(rthWindowBars([{ open: 100, high: 101, low: 99, close: 100 }]).slice(0, 3))).toBe(
      "open_unknown",
    );
  });

  it("detects open_auction on narrow chop", () => {
    const bars = rthWindowBars(
      Array.from({ length: 12 }, () => ({ open: 100, high: 100.15, low: 99.85, close: 100.02 })),
    );
    expect(classifyOpenType(bars)).toBe("open_auction");
  });

  it("detects open_rejection_reverse", () => {
    const early = [
      { open: 100, high: 101.5, low: 99.9, close: 101.2 },
      { open: 101.2, high: 101.8, low: 101.0, close: 101.5 },
      { open: 101.5, high: 102.0, low: 101.2, close: 101.8 },
      { open: 101.8, high: 102.2, low: 101.5, close: 102.0 },
      { open: 102.0, high: 102.3, low: 101.8, close: 102.1 },
      { open: 102.1, high: 102.4, low: 101.9, close: 102.2 },
    ];
    const fade = Array.from({ length: 6 }, (_, i) => ({
      open: 102 - i * 0.3,
      high: 102.1 - i * 0.25,
      low: 99.2 - i * 0.1,
      close: 99.5 - i * 0.08,
    }));
    expect(classifyOpenType(rthWindowBars([...early, ...fade]))).toBe("open_rejection_reverse");
  });

  it("detects open_test_drive on probe then drive", () => {
    const probe = [
      { open: 100, high: 100.4, low: 97, close: 99.8 },
      { open: 99.8, high: 100.2, low: 98.5, close: 100.0 },
      { open: 100.0, high: 100.3, low: 99.2, close: 100.05 },
      { open: 100.05, high: 100.4, low: 99.5, close: 100.1 },
      { open: 100.1, high: 100.5, low: 99.8, close: 100.05 },
      { open: 100.05, high: 100.3, low: 99.9, close: 100.02 },
    ];
    const drive = Array.from({ length: 6 }, (_, i) => ({
      open: 100.5 + i * 0.5,
      high: 101 + i * 0.6,
      low: 100.2 + i * 0.45,
      close: 100.8 + i * 0.55,
    }));
    expect(classifyOpenType(rthWindowBars([...probe, ...drive]))).toBe("open_test_drive");
  });

  it("detects open_drive on immediate acceptance", () => {
    const drive = Array.from({ length: 12 }, (_, i) => ({
      open: 100 + i * 0.3,
      high: 100.5 + i * 0.4,
      low: 99.9 + i * 0.25,
      close: 100.4 + i * 0.35,
    }));
    expect(classifyOpenType(rthWindowBars(drive))).toBe("open_drive");
  });
});

describe("rthBars", () => {
  it("filters to RTH session on the given date", () => {
    const bars = rthWindowBars([{ open: 100, high: 101, low: 99, close: 100 }], "2026-07-15");
    expect(rthBars(bars, "2026-07-15")).toHaveLength(1);
    expect(rthBars(bars, "2026-07-16")).toHaveLength(0);
  });
});

describe("calibration fixtures", () => {
  it("AAPL 2026-07-15 pattern → open_drive", () => {
    const drive = Array.from({ length: 18 }, (_, i) => ({
      open: 210 + i * 0.4,
      high: 210.6 + i * 0.5,
      low: 209.9 + i * 0.35,
      close: 210.5 + i * 0.45,
    }));
    expect(classifyOpenType(rthWindowBars(drive, "2026-07-15"))).toBe("open_drive");
  });

  it("SPY 2026-07-17 pattern → open_auction", () => {
    const auction = Array.from({ length: 18 }, () => ({
      open: 620,
      high: 620.8,
      low: 619.2,
      close: 620.1,
    }));
    expect(classifyOpenType(rthWindowBars(auction, "2026-07-17"))).toBe("open_auction");
  });

  it("TSLA 2026-07-06 pattern → open_test_drive", () => {
    const probe = [
      { open: 280, high: 280.5, low: 276, close: 279.5 },
      { open: 279.5, high: 280, low: 277.5, close: 279.8 },
      { open: 279.8, high: 280.2, low: 278.5, close: 280.0 },
      { open: 280.0, high: 280.4, low: 279.0, close: 280.05 },
      { open: 280.05, high: 280.5, low: 279.5, close: 280.02 },
      { open: 280.02, high: 280.4, low: 279.8, close: 280.01 },
    ];
    const drive = Array.from({ length: 12 }, (_, i) => ({
      open: 281 + i * 0.6,
      high: 281.8 + i * 0.7,
      low: 280.5 + i * 0.5,
      close: 281.5 + i * 0.65,
    }));
    expect(classifyOpenType(rthWindowBars([...probe, ...drive], "2026-07-06"))).toBe("open_test_drive");
  });
});
