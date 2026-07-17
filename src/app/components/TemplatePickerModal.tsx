"use client";

import { useCallback, useEffect, useState } from "react";
import type { PresetEnvelope, PresetKind } from "@/lib/chart/presets/types";
import { deletePreset, listPresetsByKind, loadPresets } from "@/lib/presetStorage";
import { PRESETS_UPDATED_EVENT } from "@/lib/persistence/sync/presetEvents";
import { EdgeButton, EdgeModalShell, EdgeSegmentedTabs } from "./design-system";

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

  return (
    <EdgeModalShell
      open={open}
      title="Chart templates"
      onClose={onClose}
      maxWidth="sm"
      align="center"
      testId="template-picker-modal"
    >
      <div className="border-b border-[var(--edge-border)] px-4 py-2">
        <EdgeSegmentedTabs
          segments={[
            { id: "chart", label: "Chart" },
            { id: "study", label: "Study" },
          ]}
          value={tab}
          onChange={(id) => setTab(id as PresetKind)}
        />
      </div>

      <div className="min-h-[200px] max-h-[50vh] flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-[var(--edge-text-secondary)]">
            No saved {tab} templates yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {filtered.map((preset) => (
              <li
                key={preset.id}
                className="flex items-center justify-between gap-2 rounded px-2 py-2 hover:bg-[var(--edge-surface-hover)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[var(--edge-text-primary)]">
                    {preset.name}
                  </div>
                  <div className="text-xs text-[var(--edge-text-muted)]">
                    {formatDate(preset.createdAt)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <EdgeButton
                    variant="primary"
                    onClick={() => {
                      onApply(preset);
                      onClose();
                    }}
                    className="px-2 py-1"
                  >
                    Apply
                  </EdgeButton>
                  <EdgeButton
                    variant="secondary"
                    onClick={() => handleDelete(preset.id)}
                    className="px-2 py-1 text-[var(--edge-negative)]"
                  >
                    Delete
                  </EdgeButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </EdgeModalShell>
  );
}

export { listPresetsByKind };
