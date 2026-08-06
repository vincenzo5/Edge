import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearResearchEvidenceForTests } from "@/lib/research/evidenceStore";

import { useResearchEvidence } from "./useResearchEvidence";

describe("useResearchEvidence", () => {
  beforeEach(() => {
    clearResearchEvidenceForTests();
  });

  it("returns a stable empty server snapshot across rerenders", () => {
    const { result, rerender } = renderHook(() => useResearchEvidence());
    const first = result.current.cards;

    rerender();

    expect(result.current.cards).toBe(first);
    expect(result.current.cards).toEqual([]);
  });

  it("returns a stable empty snapshot across remounts when store is empty", () => {
    const firstMount = renderHook(() => useResearchEvidence());
    const first = firstMount.result.current.cards;
    firstMount.unmount();

    const secondMount = renderHook(() => useResearchEvidence());

    expect(secondMount.result.current.cards).toBe(first);
    expect(secondMount.result.current.cards).toEqual([]);
  });

  it("does not emit getServerSnapshot cache warnings on mount", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    renderHook(() => useResearchEvidence());

    const snapshotWarnings = consoleError.mock.calls.filter(([message]) =>
      String(message).includes("getServerSnapshot should be cached"),
    );
    expect(snapshotWarnings).toEqual([]);

    consoleError.mockRestore();
  });
});
