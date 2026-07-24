/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useSearchParams } from "next/navigation";

import { useChartDeepLinkBootstrap } from "./useChartDeepLinkBootstrap";

const fetchJournalTrades = vi.hoisted(() => vi.fn());
const fetchJournalFills = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/client/journalClient", () => ({
  fetchJournalTrades,
  fetchJournalFills,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

function BootstrapHarness({
  hydrated,
  onApply,
}: {
  hydrated: boolean;
  onApply: (params: { symbol?: string; goto?: number; journalTrade?: string }) => void;
}) {
  useChartDeepLinkBootstrap(hydrated, onApply);
  return null;
}

describe("useChartDeepLinkBootstrap", () => {
  beforeEach(() => {
    fetchJournalTrades.mockReset();
    fetchJournalFills.mockReset();
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("symbol=SPY&interval=5m"));
  });

  it("applies deep-link params without fetching journal overlay data", () => {
    const onApply = vi.fn();

    render(<BootstrapHarness hydrated onApply={onApply} />);

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: "SPY",
      }),
    );
    expect(fetchJournalTrades).not.toHaveBeenCalled();
    expect(fetchJournalFills).not.toHaveBeenCalled();
  });

  it("does not apply before hydration", () => {
    const onApply = vi.fn();

    render(<BootstrapHarness hydrated={false} onApply={onApply} />);

    expect(onApply).not.toHaveBeenCalled();
  });
});
