"use client";

import { useEffect, useRef, useState } from "react";
import EdgeButton from "./design-system/EdgeButton";

type Props = {
  total: number;
  onVisibleChange: (count: number | null) => void;
  disabled?: boolean;
};

const SPEEDS = [
  { label: "0.5x", ms: 1000 },
  { label: "1x", ms: 500 },
  { label: "2x", ms: 250 },
  { label: "5x", ms: 100 },
];

export default function BarReplay({ total, onVisibleChange, disabled }: Props) {
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState<number>(Math.floor(total * 0.6));
  const [speedIdx, setSpeedIdx] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIndex((prev) => Math.min(prev, total));
  }, [total]);

  useEffect(() => {
    if (active) {
      onVisibleChange(Math.max(1, index));
    } else {
      onVisibleChange(null);
    }
  }, [active, index, onVisibleChange]);

  useEffect(() => {
    if (!active || !playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = setInterval(() => {
      setIndex((i) => {
        if (i >= total) {
          setPlaying(false);
          return total;
        }
        return i + 1;
      });
    }, SPEEDS[speedIdx].ms);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, playing, speedIdx, total]);

  if (disabled) return null;

  const toggleActive = () => {
    setActive((a) => {
      const next = !a;
      if (!next) setPlaying(false);
      return next;
    });
  };

  return (
    <div
      className="flex items-center gap-2 border-t border-[var(--edge-border)] px-2 py-1 text-sm"
      data-testid="bar-replay"
    >
      <EdgeButton
        variant={active ? "primary" : "secondary"}
        onClick={toggleActive}
        className="px-2 py-0.5"
      >
        {active ? "Stop Replay" : "Replay"}
      </EdgeButton>

      {active && (
        <>
          <EdgeButton
            variant="secondary"
            onClick={() => setPlaying((p) => !p)}
            disabled={index >= total}
            className="px-2 py-0.5"
          >
            {playing ? "Pause" : "Play"}
          </EdgeButton>
          <EdgeButton
            variant="secondary"
            onClick={() => setIndex((i) => Math.max(1, i - 1))}
            className="px-2 py-0.5"
          >
            ◀
          </EdgeButton>
          <EdgeButton
            variant="secondary"
            onClick={() => setIndex((i) => Math.min(total, i + 1))}
            className="px-2 py-0.5"
          >
            ▶
          </EdgeButton>
          <input
            type="range"
            min={1}
            max={total}
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-[var(--edge-text-muted)]">
            {index} / {total}
          </span>
          <select
            value={speedIdx}
            onChange={(e) => setSpeedIdx(Number(e.target.value))}
            className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-1 text-xs text-[var(--edge-text-primary)]"
          >
            {SPEEDS.map((s, i) => (
              <option key={s.label} value={i}>
                {s.label}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
