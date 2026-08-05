"use client";

import { useState } from "react";
import { PlusIcon, TrashIcon } from "../chart-chrome/ChartHeaderIcons";
import { EdgeButton, EdgeIconButton, EdgeLabeledInput } from "../design-system";
import {
  addJournalSetupValue,
  removeJournalSetupValue,
  renameJournalSetupValue,
  reorderJournalSetupValues,
  resetJournalSetupValues,
  useJournalSetupValues,
} from "./useJournalSetupValues";

export default function JournalSetupsSettingsSection() {
  const setups = useJournalSetupValues();
  const [newSetup, setNewSetup] = useState("");
  const [editingSetup, setEditingSetup] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  function handleAdd() {
    const trimmed = newSetup.trim();
    if (!trimmed) return;
    addJournalSetupValue(trimmed);
    setNewSetup("");
  }

  function startEditing(setup: string) {
    setEditingSetup(setup);
    setEditingValue(setup);
  }

  function commitEditing() {
    if (!editingSetup) return;
    renameJournalSetupValue(editingSetup, editingValue);
    setEditingSetup(null);
    setEditingValue("");
  }

  function cancelEditing() {
    setEditingSetup(null);
    setEditingValue("");
  }

  return (
    <section className="space-y-4" data-testid="journal-setups-settings">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--edge-text-primary)]">Setups</h3>
          <p className="mt-1 text-xs text-[var(--edge-text-secondary)]">
            Labels for the Setup field on trade review. They also appear in filters and reports.
          </p>
        </div>
        <EdgeButton
          variant="chrome"
          data-testid="journal-setups-reset"
          onClick={() => resetJournalSetupValues()}
        >
          Reset defaults
        </EdgeButton>
      </div>

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <EdgeLabeledInput
            label="New setup"
            density="compact"
            testId="journal-setups-new-input"
            value={newSetup}
            placeholder="e.g. VWAP reclaim"
            onChange={(event) => setNewSetup(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
          />
        </div>
        <EdgeIconButton
          type="button"
          title="Add setup"
          aria-label="Add setup"
          data-testid="journal-setups-add"
          onClick={handleAdd}
        >
          <PlusIcon />
        </EdgeIconButton>
      </div>

      <div className="rounded border border-[var(--edge-border-subtle)]">
        {setups.length === 0 ? (
          <p className="px-3 py-4 text-xs text-[var(--edge-text-muted)]">No setups yet.</p>
        ) : (
          setups.map((setup, index) => (
            <div
              key={setup}
              className="flex items-center justify-between gap-2 border-b border-[var(--edge-border-subtle)] px-3 py-2 last:border-b-0"
              data-testid={`journal-setup-row-${setup}`}
            >
              {editingSetup === setup ? (
                <div className="flex min-w-0 flex-1 items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <EdgeLabeledInput
                      label="Setup name"
                      density="compact"
                      testId={`journal-setup-edit-${setup}`}
                      value={editingValue}
                      onChange={(event) => setEditingValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitEditing();
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelEditing();
                        }
                      }}
                    />
                  </div>
                  <EdgeButton variant="primary" onClick={commitEditing}>
                    Save
                  </EdgeButton>
                  <EdgeButton variant="chrome" onClick={cancelEditing}>
                    Cancel
                  </EdgeButton>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-sm capitalize text-[var(--edge-text-primary)] hover:underline"
                    data-testid={`journal-setup-label-${setup}`}
                    onClick={() => startEditing(setup)}
                  >
                    {setup}
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <EdgeIconButton
                      type="button"
                      title="Move up"
                      aria-label={`Move ${setup} up`}
                      disabled={index === 0}
                      data-testid={`journal-setup-up-${setup}`}
                      onClick={() => reorderJournalSetupValues(index, index - 1)}
                    >
                      ↑
                    </EdgeIconButton>
                    <EdgeIconButton
                      type="button"
                      title="Move down"
                      aria-label={`Move ${setup} down`}
                      disabled={index === setups.length - 1}
                      data-testid={`journal-setup-down-${setup}`}
                      onClick={() => reorderJournalSetupValues(index, index + 1)}
                    >
                      ↓
                    </EdgeIconButton>
                    <EdgeIconButton
                      type="button"
                      title="Delete"
                      aria-label={`Delete ${setup}`}
                      data-testid={`journal-setup-delete-${setup}`}
                      onClick={() => removeJournalSetupValue(setup)}
                    >
                      <TrashIcon />
                    </EdgeIconButton>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
