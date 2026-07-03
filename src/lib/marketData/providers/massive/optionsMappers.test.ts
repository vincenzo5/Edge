import { describe, it, expect } from "vitest";
import {
  dedupeExpirations,
  filterSnapshotsForWindow,
  mapMassiveOptionReferenceToExpiration,
  mapMassiveOptionSnapshotToContract,
  massiveTimestampToMs,
  selectStrikesForWindow,
  strikeRangeFromWindow,
  uniqueStrikesFromReference,
} from "./optionsMappers";
import {
  massiveReferenceRows,
  massiveSnapshotRow,
  massiveSnapshotWithoutGreeks,
} from "./fixtures/optionsFixtures";

describe("massive options mappers", () => {
  it("normalizes nanosecond timestamps to ms", () => {
    expect(massiveTimestampToMs(1_700_000_000_000_000_000)).toBe(1_700_000_000_000);
  });

  it("maps reference rows to expirations", () => {
    const rows = massiveReferenceRows
      .map((row) => mapMassiveOptionReferenceToExpiration(row, "AAPL"))
      .filter((row): row is NonNullable<typeof row> => row != null);
    expect(dedupeExpirations(rows)).toEqual([{ underlying: "AAPL", expiration: "2025-06-20" }]);
  });

  it("maps snapshot rows to normalized contracts with greeks and rho null", () => {
    const contract = mapMassiveOptionSnapshotToContract(
      massiveSnapshotRow,
      "AAPL",
      "2025-06-20",
    );
    expect(contract?.contractSymbol).toBe("O:AAPL250620C00150000");
    expect(contract?.mark).toBe(1.15);
    expect(contract?.delta).toBe(0.55);
    expect(contract?.rho).toBeNull();
  });

  it("allows missing greeks without failing mapping", () => {
    const contract = mapMassiveOptionSnapshotToContract(
      massiveSnapshotWithoutGreeks,
      "AAPL",
      "2025-06-20",
    );
    expect(contract?.type).toBe("put");
    expect(contract?.delta).toBeNull();
    expect(contract?.gamma).toBeNull();
  });

  it("selects ATM strike window around spot", () => {
    const strikes = uniqueStrikesFromReference(massiveReferenceRows);
    const selected = selectStrikesForWindow(strikes, { mode: "atm", count: 2, spot: 152 });
    expect(selected).toEqual([150, 155]);
    expect(strikeRangeFromWindow(strikes, { mode: "atm", count: 2, spot: 152 })).toEqual({
      gte: 150,
      lte: 155,
    });
  });

  it("filters snapshots to ATM strike window", () => {
    const snapshots = [
      massiveSnapshotRow,
      {
        ...massiveSnapshotWithoutGreeks,
        details: {
          ...massiveSnapshotWithoutGreeks.details!,
          strike_price: 155,
          contract_type: "call" as const,
          ticker: "O:AAPL250620C00155000",
        },
      },
    ];
    const filtered = filterSnapshotsForWindow(
      snapshots,
      { underlying: "AAPL", expiration: "2025-06-20", strikeWindow: { mode: "atm", count: 1, spot: 150 } },
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.details?.strike_price).toBe(150);
  });
});
