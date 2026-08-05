import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRESENCE_EXIT_MS, usePresence } from "./usePresence";

describe("usePresence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts unmounted when closed", () => {
    const { result } = renderHook(() => usePresence(false));
    expect(result.current.mounted).toBe(false);
    expect(result.current.visible).toBe(false);
  });

  it("mounts and becomes visible when opened", () => {
    const { result } = renderHook(() => usePresence(true));
    expect(result.current.mounted).toBe(true);
    expect(result.current.visible).toBe(true);
  });

  it("stays mounted through exit delay before unmounting", () => {
    const { result, rerender } = renderHook(({ open }) => usePresence(open), {
      initialProps: { open: true },
    });
    expect(result.current.mounted).toBe(true);

    rerender({ open: false });
    expect(result.current.visible).toBe(false);
    expect(result.current.mounted).toBe(true);

    act(() => {
      vi.advanceTimersByTime(PRESENCE_EXIT_MS);
    });
    expect(result.current.mounted).toBe(false);
  });

  it("unmounts immediately when reduced motion is preferred", () => {
    vi.mocked(window.matchMedia).mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result, rerender } = renderHook(({ open }) => usePresence(open), {
      initialProps: { open: true },
    });
    rerender({ open: false });
    expect(result.current.mounted).toBe(false);
  });
});
