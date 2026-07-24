"use client";

import { useCallback, useEffect, useState } from "react";
import { EdgeButton } from "@/app/components/design-system";
import { metadataTextClass } from "@/app/components/design-system/styles";
import { LIVE_CONFIRMATION_TOKEN } from "@/lib/trading/validateOrder";
import {
  fetchPlaybookAutoManageSettings,
  patchPlaybookAutoManageSettings,
  type PlaybookAutoManageSettings,
} from "@/lib/trading/tradingClient";

type Props = {
  tradingEnvironment: "paper" | "live";
};

export function PlaybookAutoManageSettings({ tradingEnvironment }: Props) {
  const [settings, setSettings] = useState<PlaybookAutoManageSettings | null>(null);
  const [liveConfirmDraft, setLiveConfirmDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchPlaybookAutoManageSettings();
      setSettings(next);
      setError(null);
    } catch {
      setSettings(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patch = async (patchInput: Parameters<typeof patchPlaybookAutoManageSettings>[0]) => {
    setSaving(true);
    setError(null);
    try {
      const next = await patchPlaybookAutoManageSettings(patchInput);
      setSettings(next);
      if (patchInput.liveEnabled === true) {
        setLiveConfirmDraft("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update auto-manage settings");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return null;

  return (
    <div
      className="mb-2 rounded border border-[var(--edge-border-subtle)] px-2 py-2"
      data-testid="playbook-auto-manage-settings"
    >
      <div className="mb-1 text-[10px] font-semibold uppercase text-[var(--edge-text-secondary)]">
        Auto-manage
      </div>
      <label className={`${metadataTextClass()} flex items-center gap-2`}>
        <input
          type="checkbox"
          checked={settings.paperEnabled}
          disabled={saving}
          onChange={(event) => void patch({ paperEnabled: event.target.checked })}
          data-testid="playbook-auto-manage-paper"
        />
        Paper auto-manage
      </label>
      <label className={`${metadataTextClass()} mt-1 flex items-center gap-2`}>
        <input
          type="checkbox"
          checked={settings.liveEnabled}
          disabled={saving || !settings.liveConsentAt}
          onChange={(event) => void patch({ liveEnabled: event.target.checked })}
          data-testid="playbook-auto-manage-live"
        />
        Live auto-manage
      </label>
      {!settings.liveConsentAt ? (
        <div className="mt-2 flex flex-col gap-1">
          <span className={`${metadataTextClass()} text-[var(--edge-text-secondary)]`}>
            Type {LIVE_CONFIRMATION_TOKEN} to enable live auto-manage
          </span>
          <div className="flex gap-1">
            <input
              type="text"
              value={liveConfirmDraft}
              disabled={saving}
              onChange={(event) => setLiveConfirmDraft(event.target.value)}
              className="min-w-0 flex-1 rounded border border-[var(--edge-border)] bg-[var(--edge-surface)] px-2 py-1 text-[11px]"
              data-testid="playbook-auto-manage-live-confirm"
            />
            <EdgeButton
              theme="dark"
              className="!px-2 !py-1 text-[10px]"
              disabled={saving || liveConfirmDraft.trim() !== LIVE_CONFIRMATION_TOKEN}
              onClick={() =>
                void patch({
                  liveEnabled: true,
                  liveConfirmation: liveConfirmDraft.trim(),
                })
              }
            >
              Enable
            </EdgeButton>
          </div>
        </div>
      ) : (
        <div className={`${metadataTextClass()} mt-1 text-[var(--edge-text-secondary)]`}>
          Live consent recorded
          {tradingEnvironment === "live" ? " · active on live account" : ""}
        </div>
      )}
      {error ? (
        <div className={`${metadataTextClass()} mt-1 text-[var(--edge-negative)]`}>{error}</div>
      ) : null}
    </div>
  );
}
