"use client";

import { useEffect, useRef, useState } from "react";

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

  // Clamp index when total changes (new symbol/range).
  useEffect(() => {
    setIndex((prev) => Math.min(prev, total));
  }, [total]);

  // Push visible count up.
  useEffect(() => {
    if (active) {
      onVisibleChange(Math.max(1, index));
    } else {
      onVisibleChange(null);
    }
  }, [active, index, onVisibleChange]);

  // Play loop.
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
    <div className="flex items-center gap-2 border-t border-gray-200 px-2 py-1 text-sm dark:border-gray-800">
      <button
        type="button"
        onClick={toggleActive}
        className={`rounded px-2 py-0.5 text-xs ${
          active
            ? "bg-blue-600 text-white"
            : "bg-gray-100 dark:bg-gray-800"
        }`}
      >
        {active ? "Stop Replay" : "Replay"}
      </button>

      {active && (
        <>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            disabled={index >= total}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs disabled:opacity-40 dark:bg-gray-800"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(1, i - 1))}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(total, i + 1))}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800"
          >
            ▶
          </button>
          <input
            type="range"
            min={1}
            max={total}
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs opacity-60">
            {index} / {total}
          </span>
          <select
            value={speedIdx}
            onChange={(e) => setSpeedIdx(Number(e.target.value))}
            className="rounded border border-gray-300 bg-transparent text-xs dark:border-gray-700"
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
