import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useValueFlash, VALUE_FLASH_MS } from "./useValueFlash";

describe("useValueFlash", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not flash on first paint", () => {
    const { result } = renderHook(() => useValueFlash(100));
    expect(result.current.flash).toBeUndefined();
    expect(result.current.toneClass).toBe("");
  });

  it("flashes up when value increases", () => {
    const { result, rerender } = renderHook(({ value }) => useValueFlash(value), {
      initialProps: { value: 100 },
    });
    rerender({ value: 150 });
    expect(result.current.flash).toBe("up");
    expect(result.current.toneClass).toContain("positive");
  });

  it("flashes down when value decreases", () => {
    const { result, rerender } = renderHook(({ value }) => useValueFlash(value), {
      initialProps: { value: 100 },
    });
    rerender({ value: 50 });
    expect(result.current.flash).toBe("down");
    expect(result.current.toneClass).toContain("negative");
  });

  it("clears flash after timeout", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useValueFlash(value), {
      initialProps: { value: 100 },
    });
    rerender({ value: 150 });
    expect(result.current.flash).toBe("up");
    act(() => {
      vi.advanceTimersByTime(VALUE_FLASH_MS);
    });
    expect(result.current.flash).toBeUndefined();
  });

  it("ignores changes below epsilon", () => {
    const { result, rerender } = renderHook(({ value }) => useValueFlash(value), {
      initialProps: { value: 100 },
    });
    rerender({ value: 100.005 });
    expect(result.current.flash).toBeUndefined();
  });
});
