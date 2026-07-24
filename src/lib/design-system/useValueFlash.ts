import { useEffect, useRef, useState } from "react";
import { toneTextClass, type EdgeTone } from "./edge";

export const VALUE_FLASH_MS = 2_000;
const FLASH_EPSILON = 0.01;

export type ValueFlashDirection = "up" | "down";

export function useValueFlash(value: number | null | undefined): {
  toneClass: string;
  flash: ValueFlashDirection | undefined;
} {
  const prevRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flashTone, setFlashTone] = useState<EdgeTone | null>(null);

  useEffect(() => {
    if (value == null || !Number.isFinite(value)) {
      prevRef.current = null;
      initializedRef.current = false;
      setFlashTone(null);
      return;
    }

    const previous = prevRef.current;
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevRef.current = value;
      return;
    }

    if (previous != null && Math.abs(value - previous) >= FLASH_EPSILON) {
      setFlashTone(value > previous ? "positive" : "negative");
      if (flashTimerRef.current != null) {
        clearTimeout(flashTimerRef.current);
      }
      flashTimerRef.current = setTimeout(() => {
        setFlashTone(null);
        flashTimerRef.current = null;
      }, VALUE_FLASH_MS);
    }

    prevRef.current = value;
  }, [value]);

  useEffect(
    () => () => {
      if (flashTimerRef.current != null) {
        clearTimeout(flashTimerRef.current);
      }
    },
    [],
  );

  const toneClass = flashTone != null ? toneTextClass(flashTone) : "";
  const flash =
    flashTone === "positive" ? "up" : flashTone === "negative" ? "down" : undefined;

  return { toneClass, flash };
}
