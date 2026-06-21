"use client";

import { useState } from "react";

type Tool = {
  name: string; // overlay name passed to chart.createOverlay
  label: string;
  icon: string; // simple unicode/emoji glyph
};

const TOOLS: Tool[] = [
  { name: "__cursor__", label: "Cursor", icon: "↖" },
  { name: "horizontalStraightLine", label: "Horizontal Line", icon: "─" },
  { name: "verticalStraightLine", label: "Vertical Line", icon: "│" },
  { name: "straightLine", label: "Trend Line", icon: "╱" },
  { name: "rayLine", label: "Ray", icon: "⟶" },
  { name: "parallelStraightLine", label: "Parallel Channel", icon: "╱╱" },
  { name: "priceChannelLine", label: "Price Channel", icon: "⋔" },
  { name: "rect", label: "Rectangle", icon: "▭" },
  { name: "circle", label: "Circle", icon: "○" },
  { name: "fibonacciLine", label: "Fib Retracement", icon: "Fib" },
  { name: "priceLine", label: "Price Line", icon: "⌖" },
  { name: "simpleAnnotation", label: "Annotation", icon: "T" },
];

type Props = {
  onToolSelect: (toolName: string) => void;
  onClear: () => void;
  onToggleMagnet: (on: boolean) => void;
  onDeleteSelected?: () => void;
};

export default function DrawingToolbar({
  onToolSelect,
  onClear,
  onToggleMagnet,
  onDeleteSelected,
}: Props) {
  const [active, setActive] = useState("__cursor__");
  const [magnet, setMagnet] = useState(false);

  const handleClick = (tool: Tool) => {
    setActive(tool.name);
    onToolSelect(tool.name);
  };

  return (
    <div className="flex w-10 flex-col items-center gap-1 border-r border-gray-200 py-2 dark:border-gray-800">
      {TOOLS.map((t) => (
        <button
          key={t.name}
          type="button"
          title={t.label}
          onClick={() => handleClick(t)}
          className={`flex h-8 w-8 items-center justify-center rounded text-sm transition-colors ${
            active === t.name
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          {t.icon}
        </button>
      ))}
      <div className="my-1 h-px w-6 bg-gray-200 dark:bg-gray-700" />
      {onDeleteSelected && (
        <>
          <button
            type="button"
            title="Delete selected drawing"
            onClick={onDeleteSelected}
            className="flex h-8 w-8 items-center justify-center rounded text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            ⌫
          </button>
          <div className="my-1 h-px w-6 bg-gray-200 dark:bg-gray-700" />
        </>
      )}
      <button
        type="button"
        title="Magnet mode (snap to OHLC)"
        onClick={() => {
          const next = !magnet;
          setMagnet(next);
          onToggleMagnet(next);
        }}
        className={`flex h-8 w-8 items-center justify-center rounded text-sm ${
          magnet
            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
            : "hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        ⚲
      </button>
      <button
        type="button"
        title="Clear all drawings"
        onClick={onClear}
        className="flex h-8 w-8 items-center justify-center rounded text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        ✕
      </button>
    </div>
  );
}
