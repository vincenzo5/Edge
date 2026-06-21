"use client";

import { useMemo } from "react";
import type { IndicatorConfig } from "@/lib/chartConfig";
import {
  INDICATORS,
  INDICATOR_CATEGORIES,
  type IndicatorCategory,
} from "@/lib/indicators";

type Props = {
  open: boolean;
  active: IndicatorConfig[];
  onToggle: (indicator: IndicatorConfig) => void;
  onClose: () => void;
};

export default function IndicatorPicker({ open, active, onToggle, onClose }: Props) {
  const grouped = useMemo(() => {
    const out: Record<IndicatorCategory, typeof INDICATORS> = {
      Trend: [],
      Momentum: [],
      Volume: [],
      Volatility: [],
      Other: [],
    };
    for (const i of INDICATORS) out[i.category].push(i);
    return out;
  }, []);

  if (!open) return null;

  const isActive = (name: string, pane: "main" | "sub") =>
    active.some((a) => a.name === name && a.pane === pane);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Indicators</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Close
          </button>
        </div>

        {INDICATOR_CATEGORIES.filter((c) => grouped[c].length > 0).map((cat) => (
          <div key={cat} className="mb-4">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {cat}
            </h4>
            <div className="grid grid-cols-2 gap-1">
              {grouped[cat].map((ind) => {
                const pane = ind.defaultPane;
                const active = isActive(ind.name, pane);
                return (
                  <button
                    key={ind.name}
                    type="button"
                    onClick={() =>
                      onToggle({ name: ind.name, pane })
                    }
                    className={`flex items-center justify-between rounded px-2 py-1.5 text-left text-sm transition-colors ${
                      active
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                    title={ind.description}
                  >
                    <span className="font-medium">{ind.name}</span>
                    <span className="ml-1 truncate text-xs opacity-60">
                      {ind.description}
                    </span>
                    {active && <span className="ml-1 text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
