"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { CellConfig, TrackedOverlay } from "@/lib/chartConfig";
import { INDICATORS } from "@/lib/indicators";

type Props = {
  chartId: string;
  config: CellConfig;
  overlays: TrackedOverlay[];
  onConfigChange: (next: CellConfig) => void;
  onOverlayAction: {
    remove: (id: string) => void;
    setVisible: (id: string, visible: boolean) => void;
    setLocked: (id: string, locked: boolean) => void;
    rename: (id: string, label: string) => void;
    bringForward: (id: string) => void;
    sendBackward: (id: string) => void;
    duplicate: (id: string) => void;
    subscribe: (cb: () => void) => () => void;
  };
  onAddIndicator: () => void;
};

type Section = "symbol" | "indicators" | "drawings" | "data";

const SECTION_LABELS: Record<Section, string> = {
  symbol: "Symbol",
  indicators: "Indicators",
  drawings: "Drawings",
  data: "Data Window",
};

const STORAGE_PREFIX = "tv-ai:object-tree-section:";

function loadSectionState(
  chartId: string,
): Record<Section, boolean> {
  if (typeof window === "undefined")
    return { symbol: true, indicators: true, drawings: true, data: false };
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${chartId}`);
    if (raw)
      return JSON.parse(raw) as Record<Section, boolean>;
  } catch { /* ignore */ }
  return { symbol: true, indicators: true, drawings: true, data: false };
}

function saveSectionState(
  chartId: string,
  state: Record<Section, boolean>,
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${chartId}`,
      JSON.stringify(state),
    );
  } catch { /* ignore */ }
}

export default function ObjectTree({
  chartId,
  config,
  overlays,
  onConfigChange,
  onOverlayAction,
  onAddIndicator,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<Section, boolean>>(() =>
    loadSectionState(chartId),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to overlay changes so we re-render when overlays are added/removed.
  useEffect(() => {
    const unsub = onOverlayAction.subscribe(() => {
      // Force re-render by updating a counter or just using the fact that
      // overlays prop changes (parent re-renders). The subscribe is for
      // cases where parent doesn't know about the change immediately.
    });
    return unsub;
  }, [onOverlayAction]);

  // Persist section collapse state.
  const toggleSection = useCallback(
    (section: Section) => {
      setCollapsed((prev) => {
        const next = { ...prev, [section]: !prev[section] };
        saveSectionState(chartId, next);
        return next;
      });
    },
    [chartId],
  );

  // Remove indicator from config.
  const removeIndicator = useCallback(
    (name: string, pane: "main" | "sub") => {
      onConfigChange({
        ...config,
        indicators: config.indicators.filter(
          (i) => !(i.name === name && i.pane === pane),
        ),
      });
    },
    [config, onConfigChange],
  );

  // Start inline rename.
  const startRename = useCallback((id: string, currentLabel: string) => {
    setEditingId(id);
    setEditValue(currentLabel);
    requestAnimationFrame(() => editInputRef.current?.focus());
  }, []);

  const commitRename = useCallback(() => {
    if (editingId && editValue.trim()) {
      onOverlayAction.rename(editingId, editValue.trim());
    }
    setEditingId(null);
  }, [editingId, editValue, onOverlayAction]);

  // Sort overlays by zLevel descending (higher z = drawn on top = show first in tree).
  const sortedOverlays = [...overlays].sort((a, b) => b.zLevel - a.zLevel);

  // Get indicator metadata for display names.
  const getIndicatorMeta = (name: string) =>
    INDICATORS.find((i) => i.name === name);

  // Data window placeholder values.
  const indicatorCount = config.indicators.length;
  const drawingCount = overlays.length;

  return (
    <div className="flex w-[220px] shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center justify-between border-b border-gray-100 px-2 py-1.5 dark:border-gray-800">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Objects
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Symbol Section */}
        <SectionHeader
          section="symbol"
          label={SECTION_LABELS.symbol}
          collapsed={collapsed.symbol}
          onToggle={toggleSection}
        />
        {!collapsed.symbol && (
          <div className="border-b border-gray-100 px-2 py-1.5 dark:border-gray-800">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-gray-700 dark:text-gray-300">
                {config.symbol}
              </span>
              <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
                {config.range} · {config.interval}
              </span>
            </div>
          </div>
        )}

        {/* Indicators Section */}
        <SectionHeader
          section="indicators"
          label={`${SECTION_LABELS.indicators} (${indicatorCount})`}
          collapsed={collapsed.indicators}
          onToggle={toggleSection}
        />
        {!collapsed.indicators && (
          <div className="border-b border-gray-100 dark:border-gray-800">
            {config.indicators.length === 0 ? (
              <div className="px-2 py-1 text-xs italic text-gray-400 dark:text-gray-500">
                (none)
              </div>
            ) : (
              config.indicators.map((ind) => {
                const meta = getIndicatorMeta(ind.name);
                return (
                  <div
                    key={`${ind.name}-${ind.pane}`}
                    className="flex items-center gap-1 px-2 py-0.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <span className="truncate text-gray-700 dark:text-gray-300">
                      {ind.name}
                    </span>
                    {meta && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {meta.description}
                      </span>
                    )}
                    <button
                      type="button"
                      title={`Remove ${ind.name}`}
                      onClick={() => removeIndicator(ind.name, ind.pane)}
                      className="ml-auto flex h-5 w-5 items-center justify-center rounded text-xs text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                );
              })
            )}
            <button
              type="button"
              onClick={onAddIndicator}
              className="w-full px-2 py-1 text-left text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
            >
              + Add indicator...
            </button>
          </div>
        )}

        {/* Drawings Section */}
        <SectionHeader
          section="drawings"
          label={`${SECTION_LABELS.drawings} (${drawingCount})`}
          collapsed={collapsed.drawings}
          onToggle={toggleSection}
        />
        {!collapsed.drawings && (
          <div className="border-b border-gray-100 dark:border-gray-800">
            {sortedOverlays.length === 0 ? (
              <div className="px-2 py-1 text-xs italic text-gray-400 dark:text-gray-500">
                (none)
              </div>
            ) : (
              sortedOverlays.map((o) => (
                <div
                  key={o.id}
                  className={`flex items-center gap-1 px-1 py-0.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-900 ${
                    !o.visible ? "opacity-40" : ""
                  }`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", o.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData(
                      "text/plain",
                    );
                    if (draggedId && draggedId !== o.id) {
                      // Drag a drawing below another reorders it.
                      onOverlayAction.bringForward(draggedId);
                    }
                  }}
                >
                  {/* Visibility toggle */}
                  <button
                    type="button"
                    title={o.visible ? "Hide" : "Show"}
                    onClick={() =>
                      onOverlayAction.setVisible(o.id, !o.visible)
                    }
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {o.visible ? "👁" : "—"}
                  </button>

                  {/* Lock toggle */}
                  <button
                    type="button"
                    title={o.locked ? "Unlock" : "Lock"}
                    onClick={() =>
                      onOverlayAction.setLocked(o.id, !o.locked)
                    }
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs ${
                      o.locked
                        ? "text-orange-500"
                        : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {o.locked ? "🔒" : "🔓"}
                  </button>

                  {/* Label (editable) */}
                  {editingId === o.id ? (
                    <input
                      ref={editInputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="min-w-0 flex-1 rounded border border-blue-300 bg-white px-1 py-0 text-xs dark:border-blue-600 dark:bg-gray-800 dark:text-gray-200"
                    />
                  ) : (
                    <span
                      className="min-w-0 flex-1 cursor-default truncate text-xs text-gray-700 dark:text-gray-300"
                      onDoubleClick={() =>
                        startRename(o.id, o.label)
                      }
                      title="Double-click to rename"
                    >
                      {o.label || o.name}
                    </span>
                  )}

                  {/* Delete */}
                  <button
                    type="button"
                    title="Remove"
                    onClick={() =>
                      onOverlayAction.remove(o.id)
                    }
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs text-red-400 opacity-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 [div:hover>&]:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Data Window Section */}
        <SectionHeader
          section="data"
          label={SECTION_LABELS.data}
          collapsed={collapsed.data}
          onToggle={toggleSection}
        />
        {!collapsed.data && (
          <div className="px-2 py-1 text-xs text-gray-400 dark:text-gray-500 italic">
            Hover over the chart to see values.
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  section,
  label,
  collapsed,
  onToggle,
}: {
  section: Section;
  label: string;
  collapsed: boolean;
  onToggle: (section: Section) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(section)}
      className="flex w-full items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900"
    >
      <span className="text-[10px] transition-transform">
        {collapsed ? "▶" : "▼"}
      </span>
      <span>{label}</span>
    </button>
  );
}