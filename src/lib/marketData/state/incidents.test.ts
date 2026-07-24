import { describe, expect, it } from "vitest";
import { projectWarningsToIncidents, mergeIncidents, resetIncidentSequenceForTests } from "./incidents";

describe("data incidents", () => {
  it("projects incident warnings only", () => {
    resetIncidentSequenceForTests();
    const incidents = projectWarningsToIncidents(
      [
        "Yahoo fallback in use",
        "first snapshot timeout",
        "TWS temporarily skipped (gateway_disconnected)",
      ],
      { datasetId: "chart_candles" },
    );
    expect(incidents.length).toBe(2);
    expect(incidents.every((row) => row.status === "active")).toBe(true);
  });

  it("dedupes active incidents within the window", () => {
    resetIncidentSequenceForTests();
    const first = projectWarningsToIncidents(["Yahoo fallback in use"], {
      datasetId: "watchlist_quotes",
    });
    const merged = mergeIncidents(first, first);
    expect(merged.filter((row) => row.status === "active")).toHaveLength(1);
  });
});
