"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import EdgeSelect from "../design-system/EdgeSelect";
import { labeledFieldClass, annotationTextClass } from "../design-system/styles";
import TwsRecoverButton from "../data-health/TwsRecoverButton";
import AccountAliasEditor from "./AccountAliasEditor";
import { useAccountAliases } from "../AccountAliasesProvider";
import {
  patchConnectionClient,
  useConnectionsList,
} from "@/lib/connections";
import {
  buildIbSocketRows,
  shouldShowTwsRecovery,
  twsRecoveryButtonLabel,
  type ServerHealthPayload,
} from "@/lib/marketData/health";
import {
  type DataConnectionId,
} from "@/lib/marketData/dataConnectionPreference";
import { useDataConnectionPreference } from "@/lib/marketData/useDataConnectionPreference";
import type { TradingAccount } from "@/lib/trading/types";
import {
  connectionStatusLabel,
  connectionStatusTone,
} from "./connectionStatusLabel";

type Props = {
  enabled: boolean;
  health: ServerHealthPayload | null;
  healthLoading: boolean;
  healthError: string | null;
  accounts: TradingAccount[];
  accountsLoading: boolean;
  recoveringTws: boolean;
  recoverMessage: string | null;
  onRecoverTws: () => void;
};

function statusDotClass(tone: ReturnType<typeof connectionStatusTone>): string {
  switch (tone) {
    case "positive":
      return "bg-[var(--edge-positive)]";
    case "warning":
      return "bg-[var(--edge-warning)]";
    case "negative":
      return "bg-[var(--edge-negative)]";
    default:
      return "bg-[var(--edge-text-muted)]";
  }
}

function ConnectionDisplayNameField({
  connectionId,
  displayName,
  editable,
  onSaved,
}: {
  connectionId: string;
  displayName: string;
  editable: boolean;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(displayName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(displayName);
  }, [displayName]);

  const save = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === displayName || !editable) return;
    setSaving(true);
    try {
      await patchConnectionClient(connectionId, { displayName: trimmed });
      onSaved();
    } catch {
      setValue(displayName);
    } finally {
      setSaving(false);
    }
  }, [connectionId, displayName, editable, onSaved, value]);

  if (!editable) {
    return (
      <span className="text-sm font-medium text-[var(--edge-text-strong)]">{displayName}</span>
    );
  }

  return (
    <input
      type="text"
      value={value}
      disabled={saving}
      aria-label={`Display name for ${connectionId}`}
      data-testid={`app-settings-connection-name-${connectionId}`}
      className="w-full min-w-0 rounded-[var(--edge-radius-sm)] border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-[var(--edge-text-strong)] hover:border-[var(--edge-border-subtle)] focus:border-[var(--edge-border)] focus:outline-none"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        void save();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export default function ConnectionsSettingsSection({
  enabled,
  health,
  healthLoading,
  healthError,
  accounts,
  accountsLoading,
  recoveringTws,
  recoverMessage,
  onRecoverTws,
}: Props) {
  const { preference, setPreference } = useDataConnectionPreference();
  const { aliases, setAlias } = useAccountAliases();
  const { connections, source, loading: connectionsLoading, refresh } = useConnectionsList({
    enabled,
  });

  const socketRows = useMemo(() => {
    if (!health?.twsStatus) return [];
    return buildIbSocketRows(health.twsStatus);
  }, [health?.twsStatus]);

  const socketByConnectionId = useMemo(
    () => new Map(socketRows.map((row) => [row.connectionId, row])),
    [socketRows],
  );

  const twsProvider = health?.providers.find((row) => row.id === "tws");
  const showRecovery = shouldShowTwsRecovery(twsProvider);
  const recoveryLabel = twsRecoveryButtonLabel(twsProvider);

  const dataConnectionOptions = useMemo(
    () =>
      connections.map((connection) => ({
        value: connection.id as DataConnectionId,
        label: connection.displayName,
      })),
    [connections],
  );

  if (!enabled) return null;

  return (
    <section
      className="space-y-4"
      aria-labelledby="app-settings-connections-heading"
      data-testid="app-settings-connections-section"
    >
      <div className="space-y-1">
        <h3
          id="app-settings-connections-heading"
          className="text-sm font-semibold text-[var(--edge-text-strong)]"
        >
          Connections
        </h3>
        <p className="text-xs text-[var(--edge-text-secondary)]">
          Manage IB Gateway connections, chart data preference, and account display names. The header
          Data and Account chips use the same settings.
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
          Broker gateways
        </h4>
        {healthLoading || connectionsLoading ? (
          <p className={`${annotationTextClass()} text-[var(--edge-text-secondary)]`}>
            Loading connection status…
          </p>
        ) : healthError ? (
          <p
            role="alert"
            className={`${annotationTextClass()} text-[var(--edge-negative)]`}
            data-testid="app-settings-connections-health-error"
          >
            {healthError}
          </p>
        ) : (
          <ul className="space-y-2" data-testid="app-settings-connection-list">
            {connections.map((connection) => {
              const socket = socketByConnectionId.get(connection.id as DataConnectionId);
              const status = socket?.status ?? "disabled";
              const tone = connectionStatusTone(status);
              return (
                <li
                  key={connection.id}
                  data-testid={`app-settings-connection-row-${connection.id}`}
                  className="rounded-[var(--edge-radius-md)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(tone)}`}
                        />
                        <ConnectionDisplayNameField
                          connectionId={connection.id}
                          displayName={connection.displayName}
                          editable={source === "remote"}
                          onSaved={() => {
                            void refresh();
                          }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[var(--edge-text-secondary)]">
                        {connection.environment === "paper" ? "Paper trading" : "Live trading"} ·{" "}
                        {connectionStatusLabel(status)}
                      </p>
                      {socket?.detail ? (
                        <p className="mt-0.5 text-xs text-[var(--edge-text-muted)]">{socket.detail}</p>
                      ) : null}
                    </div>
                    {preference === connection.id ? (
                      <span
                        className="shrink-0 rounded-[var(--edge-radius-sm)] bg-[var(--edge-surface-active)] px-2 py-0.5 text-xs text-[var(--edge-accent-blue)]"
                        data-testid={`app-settings-connection-active-${connection.id}`}
                      >
                        Chart data
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={labeledFieldClass()}>
        <label htmlFor="app-settings-data-connection" className="text-[var(--edge-text-secondary)]">
          Chart data connection
        </label>
        <EdgeSelect
          value={preference}
          options={dataConnectionOptions}
          onChange={setPreference}
          variant="field"
          density="standard"
          testId="app-settings-data-connection"
          aria-label="Chart data connection"
        />
        <p className="text-xs text-[var(--edge-text-secondary)]">
          Controls which IB Gateway supplies chart candles and quotes. Same preference as the header
          Data chip.
        </p>
      </div>

      {showRecovery ? (
        <div className="space-y-2">
          <TwsRecoverButton
            label={recoveryLabel}
            recovering={recoveringTws}
            onClick={onRecoverTws}
            testId="app-settings-recover-tws"
          />
          {recoverMessage ? (
            <p
              className={`${annotationTextClass()} text-[var(--edge-text-secondary)]`}
              data-testid="app-settings-recover-message"
            >
              {recoverMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
          Account display names
        </h4>
        {accountsLoading ? (
          <p className={`${annotationTextClass()} text-[var(--edge-text-secondary)]`}>
            Loading accounts…
          </p>
        ) : (
          <div className="rounded-[var(--edge-radius-md)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)]">
            <AccountAliasEditor accounts={accounts} aliases={aliases} onSetAlias={setAlias} />
          </div>
        )}
      </div>
    </section>
  );
}
