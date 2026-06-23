"use client";

import { useCallback, useEffect, useState } from "react";
import type { PresetEnvelope, PresetKind } from "@/lib/chart/presets/types";
import { deletePreset, listPresetsByKind, loadPresets } from "@/lib/presetStorage";
import { PRESETS_UPDATED_EVENT } from "@/lib/persistence/sync/presetEvents";

type Props = {
  open: boolean;
  initialTab: PresetKind;
  onClose: () => void;
  onApply: (preset: PresetEnvelope) => void;
};

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function TemplatePickerModal({
  open,
  initialTab,
  onClose,
  onApply,
}: Props) {
  const [tab, setTab] = useState<PresetKind>(initialTab);
  const [presets, setPresets] = useState<PresetEnvelope[]>([]);

  const refresh = useCallback(() => {
    setPresets(loadPresets());
  }, []);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      refresh();
    }
  }, [open, initialTab, refresh]);

  useEffect(() => {
    const onPresetsUpdated = () => refresh();
    window.addEventListener(PRESETS_UPDATED_EVENT, onPresetsUpdated);
    return () => window.removeEventListener(PRESETS_UPDATED_EVENT, onPresetsUpdated);
  }, [refresh]);

  const filtered = presets.filter((p) => p.kind === tab);

  const handleDelete = (id: string) => {
    deletePreset(id);
    refresh();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h3 className="text-base font-semibold">Chart templates</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(["chart", "study"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setTab(kind)}
              className={`flex-1 px-3 py-2 text-sm capitalize ${
                tab === kind
                  ? "border-b-2 border-blue-600 font-medium text-blue-600"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {kind}
            </button>
          ))}
        </div>

        <div className="min-h-[200px] flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No saved {tab} templates yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((preset) => (
                <li
                  key={preset.id}
                  className="flex items-center justify-between gap-2 rounded px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{preset.name}</div>
                    <div className="text-xs text-gray-500">{formatDate(preset.createdAt)}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onApply(preset);
                        onClose();
                      }}
                      className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(preset.id)}
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export { listPresetsByKind };
