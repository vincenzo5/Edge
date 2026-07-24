"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CompactSearchIcon,
  EdgeButton,
  EdgeEmptyState,
  EdgeModalShell,
  EdgeSearchInput,
  EdgeSegmentedTabs,
  EdgeSpinner,
} from "../design-system";
import { bodyTextClass, headerChipClass, metadataTextClass } from "../design-system/styles";
import { getModelRef } from "@/lib/ai/model/allowlist";
import {
  resetEnabledModelsToSeed,
  setCatalogModelLabels,
  toggleEnabledModel,
} from "@/lib/ai/model/enabledModelsStore";
import type { CatalogModel } from "@/lib/ai/model/openrouterModels";
import { useEnabledModelIds } from "./useEnabledAgentModels";

type Props = {
  open: boolean;
  onClose: () => void;
  onEnabledChange?: (enabledIds: string[]) => void;
};

type CatalogState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; popular: CatalogModel[]; recent: CatalogModel[] };

type BrowseTab = "popular" | "recent" | "enabled";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "x-ai": "xAI",
  meta: "Meta",
  "meta-llama": "Meta",
  "z-ai": "Z.AI",
};

const PROVIDER_BADGE_LETTERS: Record<string, string> = {
  openai: "O",
  anthropic: "A",
  google: "G",
  "x-ai": "X",
  meta: "M",
  "meta-llama": "M",
  "z-ai": "Z",
};

export function providerFromModelId(id: string): { slug: string; label: string } {
  const slug = id.split("/")[0] ?? id;
  const known = PROVIDER_LABELS[slug];
  if (known) return { slug, label: known };
  const label = slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return { slug, label };
}

export function providerBadgeLetter(slug: string): string {
  return PROVIDER_BADGE_LETTERS[slug] ?? (slug.charAt(0).toUpperCase() || "?");
}

export function displayNameFromLabel(label: string): { name: string; free: boolean } {
  let name = label.trim();
  let free = false;
  const freeMatch = /\s*\((free)\)\s*$/i.exec(name);
  if (freeMatch) {
    free = true;
    name = name.slice(0, freeMatch.index).trim();
  }
  const colonIdx = name.indexOf(": ");
  if (colonIdx > 0 && colonIdx < 24) {
    name = name.slice(colonIdx + 2).trim();
  }
  return { name, free };
}

function resolveCatalogModel(id: string, labelOverride?: string): CatalogModel | null {
  const ref = getModelRef(id, labelOverride);
  if (!ref) return null;
  return { id: ref.id, label: labelOverride ?? ref.label, tools: true };
}

function matchesSearch(model: CatalogModel, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  const { name } = displayNameFromLabel(model.label);
  return (
    model.label.toLowerCase().includes(trimmed) ||
    model.id.toLowerCase().includes(trimmed) ||
    name.toLowerCase().includes(trimmed)
  );
}

function ActiveChip({
  model,
  removable,
  onRemove,
}: {
  model: CatalogModel;
  removable: boolean;
  onRemove: () => void;
}) {
  const { name } = displayNameFromLabel(model.label);
  return (
    <span
      className={`inline-flex max-w-[10rem] items-center gap-1 ${headerChipClass(!removable)} bg-[var(--edge-surface-panel)]`}
      data-testid={`copilot-model-active-chip-${model.id.replace(/\//g, "--")}`}
    >
      <span className="min-w-0 truncate">{name}</span>
      <button
        type="button"
        className="edge-focus-ring inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--edge-radius-sm)] text-[var(--edge-text-muted)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Remove ${name} from picker`}
        disabled={!removable}
        onClick={onRemove}
      >
        ×
      </button>
    </span>
  );
}

function ModelRow({
  model,
  checked,
  disabled,
  onToggle,
}: {
  model: CatalogModel;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const provider = providerFromModelId(model.id);
  const { name, free } = displayNameFromLabel(model.label);

  return (
    <label
      className={`edge-menu-item edge-focus-ring flex cursor-pointer items-center gap-2.5 rounded-[var(--edge-radius-sm)] px-2 py-2 ${
        checked ? "bg-[color-mix(in_srgb,var(--edge-accent-blue)_12%,transparent)]" : ""
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
      data-testid={`copilot-model-toggle-${model.id.replace(/\//g, "--")}`}
    >
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--edge-radius-sm)] border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-toolbar)] text-[10px] font-semibold text-[var(--edge-text-secondary)]"
        aria-hidden
      >
        {providerBadgeLetter(provider.slug)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={`min-w-0 truncate ${bodyTextClass()} text-[var(--edge-text-primary)]`}>{name}</span>
          {free ? (
            <span className={`shrink-0 rounded-[var(--edge-radius-sm)] border border-[var(--edge-border-subtle)] px-1 py-px ${metadataTextClass()}`}>
              free
            </span>
          ) : null}
        </span>
        <span className={`block truncate ${metadataTextClass()}`}>{provider.label}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        aria-label={name}
        className="shrink-0"
      />
    </label>
  );
}

export function CopilotModelSettingsModal({ open, onClose, onEnabledChange }: Props) {
  const enabledIdsList = useEnabledModelIds();
  const enabledIds = useMemo(() => new Set(enabledIdsList), [enabledIdsList]);
  const [catalogState, setCatalogState] = useState<CatalogState>({ status: "idle" });
  const [reloadKey, setReloadKey] = useState(0);
  const [browseTab, setBrowseTab] = useState<BrowseTab>("popular");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setCatalogState({ status: "idle" });
      setBrowseTab("popular");
      setSearchQuery("");
      return;
    }

    let cancelled = false;
    setCatalogState({ status: "loading" });

    void fetch("/api/ai/models")
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Failed to load models (${response.status})`);
        }
        return response.json() as Promise<{ popular: CatalogModel[]; recent: CatalogModel[] }>;
      })
      .then((catalog) => {
        if (cancelled) return;
        setCatalogModelLabels([...catalog.popular, ...catalog.recent]);
        setCatalogState({ status: "ready", popular: catalog.popular, recent: catalog.recent });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to load models";
        setCatalogState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, [open, reloadKey]);

  const catalogById = useMemo(() => {
    const map = new Map<string, CatalogModel>();
    if (catalogState.status !== "ready") return map;
    for (const model of [...catalogState.popular, ...catalogState.recent]) {
      map.set(model.id, model);
    }
    return map;
  }, [catalogState]);

  const enabledModels = useMemo(() => {
    return enabledIdsList
      .map((id) => catalogById.get(id) ?? resolveCatalogModel(id))
      .filter((model): model is CatalogModel => model != null);
  }, [catalogById, enabledIdsList]);

  const tabModels = useMemo((): CatalogModel[] => {
    if (catalogState.status !== "ready") return [];

    if (browseTab === "popular") return catalogState.popular;
    if (browseTab === "recent") return catalogState.recent;

    return enabledIdsList
      .map((id) => catalogById.get(id) ?? resolveCatalogModel(id))
      .filter((model): model is CatalogModel => model != null);
  }, [browseTab, catalogById, catalogState, enabledIdsList]);

  const visibleModels = useMemo(() => {
    return tabModels.filter((model) => matchesSearch(model, searchQuery));
  }, [searchQuery, tabModels]);

  const handleToggle = useCallback(
    (modelId: string, enabled: boolean) => {
      const next = toggleEnabledModel(modelId, enabled);
      onEnabledChange?.(next);
    },
    [onEnabledChange],
  );

  const handleReset = useCallback(() => {
    const next = resetEnabledModelsToSeed();
    onEnabledChange?.(next);
  }, [onEnabledChange]);

  const browseSegments = useMemo(
    () => [
      { id: "popular", label: "Popular" },
      { id: "recent", label: "Recent" },
      { id: "enabled", label: `Enabled (${enabledIdsList.length})` },
    ],
    [enabledIdsList.length],
  );

  return (
    <EdgeModalShell
      open={open}
      title="Copilot settings"
      subtitle="Choose which models appear in the agent picker."
      onClose={onClose}
      maxWidth="md"
      testId="copilot-model-settings-modal"
      footer={
        <div className="flex items-center justify-between gap-3">
          <EdgeButton type="button" variant="secondary" data-testid="copilot-model-settings-reset" onClick={handleReset}>
            Reset to defaults
          </EdgeButton>
          <EdgeButton type="button" variant="primary" data-testid="copilot-model-settings-done" onClick={onClose}>
            Done
          </EdgeButton>
        </div>
      }
    >
      {catalogState.status === "loading" || catalogState.status === "idle" ? (
        <div className="flex items-center gap-2 px-1 py-6 text-sm text-[var(--edge-text-secondary)]" data-testid="copilot-model-settings-loading">
          <EdgeSpinner size="sm" />
          Loading models from OpenRouter…
        </div>
      ) : null}

      {catalogState.status === "error" ? (
        <EdgeEmptyState
          message={catalogState.message}
          action={
            <EdgeButton
              type="button"
              variant="secondary"
              data-testid="copilot-model-settings-retry"
              onClick={() => {
                setCatalogState({ status: "loading" });
                setReloadKey((key) => key + 1);
              }}
            >
              Retry
            </EdgeButton>
          }
        />
      ) : null}

      {catalogState.status === "ready" ? (
        <div className="space-y-3" data-testid="copilot-model-settings-sections">
          <div className="space-y-2">
            <p className={`${metadataTextClass()} px-0.5`}>
              {enabledIdsList.length} {enabledIdsList.length === 1 ? "model" : "models"} in picker
            </p>
            <div
              className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto"
              data-testid="copilot-model-settings-active-chips"
            >
              {enabledModels.map((model) => {
                const checked = enabledIds.has(model.id);
                const canRemove = !(checked && enabledIdsList.length <= 1);
                return (
                  <ActiveChip
                    key={model.id}
                    model={model}
                    removable={canRemove}
                    onRemove={() => handleToggle(model.id, false)}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-2 border-t border-[var(--edge-border-subtle)] pt-3">
            <div data-testid="copilot-model-settings-tabs">
              <EdgeSegmentedTabs
                segments={browseSegments}
                value={browseTab}
                onChange={(id) => setBrowseTab(id as BrowseTab)}
              />
            </div>
            <EdgeSearchInput
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Search models…"
              aria-label="Search models"
              leadingIcon={
                <span className="inline-flex shrink-0 text-[var(--edge-text-muted)]">
                  <CompactSearchIcon />
                </span>
              }
              data-testid="copilot-model-settings-search"
            />
          </div>

          <div className="max-h-64 overflow-y-auto py-0.5" data-testid="copilot-model-settings-list">
            {visibleModels.length === 0 ? (
              <p className={`px-2 py-4 text-center ${metadataTextClass()}`} data-testid="copilot-model-settings-empty">
                No models match
              </p>
            ) : (
              visibleModels.map((model) => {
                const checked = enabledIds.has(model.id);
                const disabled = checked && enabledIdsList.length <= 1;
                return (
                  <ModelRow
                    key={`${browseTab}-${model.id}`}
                    model={model}
                    checked={checked}
                    disabled={disabled}
                    onToggle={() => handleToggle(model.id, !checked)}
                  />
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </EdgeModalShell>
  );
}
