"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "@/app/components/AccountProvider";
import { EdgeAnchoredPopover, EdgeButton } from "@/app/components/design-system";
import {
  annotationTextClass,
  bodyTextClass,
  headerChipClass,
  metadataTextClass,
} from "@/app/components/design-system/styles";
import { useAppChromeActions } from "@/app/components/home/AppChromeActionsProvider";
import { ClosePositionConfirmModal } from "@/app/components/sidebar/panels/ClosePositionConfirmModal";
import { WORKSPACE_SURFACE_LINKS } from "@/lib/appWorkspace/deepLinks";
import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";
import { toneTextClass, type EdgeTone } from "@/lib/design-system/edge";
import { useValueFlash } from "@/lib/design-system/useValueFlash";
import { buildClosePositionDraft } from "@/lib/trading/closePositionDraft";
import type { OrderDraft, TradingAccount } from "@/lib/trading/types";
import {
  countOpenPositions,
  formatOpenRiskChipLabel,
  formatSignedMoney,
  resolveOpenRiskUnrealized,
} from "@/lib/trading/openRiskSummary";
import { useOpenRiskNavigation } from "./OpenRiskWorkspaceBridge";
import { usePlaybookInstances } from "@/app/components/trading/usePlaybookInstances";
import { OpenPositionExitsStrip } from "@/app/components/trading/OpenPositionExitsStrip";
import {
  findActivePlaybookForPosition,
} from "@/lib/trading/playbook/display";
import { summarizeOpenPositionExits, DETACH_MANAGE_HINT, PAUSE_MANAGE_HINT } from "@/lib/trading/summarizeOpenPositionExits";
import { AccountRiskGateStrip } from "@/app/components/risk/AccountRiskGateStrip";
import { useAccountRiskGateStatus } from "@/app/components/risk/useAccountRiskGateStatus";
import { useRiskSettingsOptional } from "@/app/components/RiskSettingsProvider";
import { DEFAULT_RISK_SETTINGS } from "@/lib/risk/riskSettings";
import type { AccountOrder } from "@/lib/marketData/contracts/brokerage";
import {
  detachPlaybookInstance,
  pausePlaybookInstance,
  resumePlaybookInstance,
  skipNextPlaybookRule,
} from "@/lib/trading/tradingClient";
import type { PlaybookInstance } from "@/lib/trading/playbook/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function pnlTone(value: number | null | undefined): EdgeTone {
  if (value == null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

function pnlColorClass(value: number | null | undefined): string {
  const tone = pnlTone(value);
  return tone === "neutral" ? "text-[var(--edge-text-primary)]" : toneTextClass(tone);
}

function pnlDotClass(value: number | null | undefined): string {
  const tone = pnlTone(value);
  if (tone === "positive") return "bg-[var(--edge-positive)]";
  if (tone === "negative") return "bg-[var(--edge-negative)]";
  return "bg-[var(--edge-text-secondary)]";
}

function resolvePanelTradingAccount(
  activeTradingAccount: TradingAccount | null | undefined,
  activeTradingAccountId: string | null | undefined,
  tradingEnvironment: TradingAccount["environment"],
): TradingAccount | null {
  if (activeTradingAccount) return activeTradingAccount;
  const accountId = activeTradingAccountId?.trim();
  if (!accountId) return null;
  return {
    broker: "ib",
    connectionId: tradingEnvironment === "live" ? "ib-live" : "ib-paper",
    accountId,
    environment: tradingEnvironment,
    availability: "online",
  };
}

function PositionPopoverRow({
  row,
  onChart,
  onClose,
  manageInstance,
  openOrders,
  onProtect,
  onDetach,
  onPause,
  onResume,
  onSkip,
}: {
  row: AccountPosition;
  onChart: (symbol: string) => void;
  onClose: (row: AccountPosition) => void;
  manageInstance: PlaybookInstance | null;
  openOrders: AccountOrder[];
  onProtect: () => void;
  onDetach: (instance: PlaybookInstance) => void;
  onPause: (instance: PlaybookInstance) => void;
  onResume: (instance: PlaybookInstance) => void;
  onSkip: (instance: PlaybookInstance) => void;
}) {
  const symbol = row.contract.symbol?.trim().toUpperCase() ?? "—";
  const qty = row.position ?? 0;
  const pnl = row.unrealizedPNL;
  const pnlFlash = useValueFlash(pnl);
  const pnlClass = pnlFlash.toneClass || pnlColorClass(pnl);
  const canAct = qty !== 0 && symbol !== "—";
  const lastPrice = row.marketPrice ?? null;
  const exitsSummary = summarizeOpenPositionExits({
    position: row,
    orders: openOrders,
    manageInstance,
    lastPrice,
  });

  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-[var(--edge-border-subtle)] px-3 py-2 last:border-b-0"
      data-testid={`open-risk-row-${symbol}`}
    >
      <button
        type="button"
        className="min-w-0 text-left"
        onClick={() => canAct && onChart(symbol)}
      >
        <div className={`${bodyTextClass()} truncate font-medium text-[var(--edge-text-primary)]`}>
          {symbol}
        </div>
        <div className={`${metadataTextClass()} text-[var(--edge-text-secondary)]`}>
          {qty > 0 ? `Long ${qty}` : `Short ${Math.abs(qty)}`}
        </div>
        <OpenPositionExitsStrip
          summary={exitsSummary}
          symbol={symbol}
          onProtect={onProtect}
          compact
        />
      </button>
      <span
        className={`${metadataTextClass()} tabular-nums ${pnlClass}`}
        data-flash={pnlFlash.flash}
      >
        {formatSignedMoney(pnl)}
      </span>
      <div className="flex flex-col items-end gap-1">
        {manageInstance ? (
          <>
            {manageInstance.status === "paused" ? (
              <EdgeButton
                theme="dark"
                className="!px-2 !py-0.5 text-[10px]"
                disabled={!canAct}
                title={PAUSE_MANAGE_HINT}
                onClick={() => onResume(manageInstance)}
                data-testid={`open-risk-resume-${symbol}`}
              >
                Resume Manage
              </EdgeButton>
            ) : (
              <EdgeButton
                theme="dark"
                className="!px-2 !py-0.5 text-[10px]"
                disabled={!canAct}
                title={PAUSE_MANAGE_HINT}
                onClick={() => onPause(manageInstance)}
                data-testid={`open-risk-pause-${symbol}`}
              >
                Pause Manage
              </EdgeButton>
            )}
            <EdgeButton
              theme="dark"
              className="!px-2 !py-0.5 text-[10px]"
              disabled={!canAct}
              onClick={() => onSkip(manageInstance)}
              data-testid={`open-risk-skip-${symbol}`}
            >
              Skip
            </EdgeButton>
            <EdgeButton
              theme="dark"
              className="!px-2 !py-0.5 text-[10px]"
              disabled={!canAct}
              title={DETACH_MANAGE_HINT}
              onClick={() => onDetach(manageInstance)}
              data-testid={`open-risk-detach-${symbol}`}
            >
              Detach Manage
            </EdgeButton>
          </>
        ) : null}
        <EdgeButton
          theme="dark"
          className="!px-2 !py-0.5 text-[10px]"
          disabled={!canAct}
          onClick={() => onClose(row)}
          data-testid={manageInstance ? `open-risk-flatten-${symbol}` : `open-risk-close-${symbol}`}
        >
          {manageInstance ? "Flatten now" : "Close"}
        </EdgeButton>
      </div>
    </div>
  );
}

export default function OpenRiskPositionsMenu({ open, onOpenChange }: Props) {
  const account = useAccount();
  const { registerOpenRiskCount } = useAppChromeActions();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { handleOpenAccount, handleLoadSymbol } = useOpenRiskNavigation();
  const [closeDraft, setCloseDraft] = useState<OrderDraft | null>(null);

  const openPositions = useMemo(
    () =>
      [...account.positions]
        .filter((row) => (row.position ?? 0) !== 0)
        .sort((a, b) => Math.abs(b.marketValue ?? 0) - Math.abs(a.marketValue ?? 0)),
    [account.positions],
  );
  const openCount = openPositions.length;
  const unrealized = resolveOpenRiskUnrealized(openPositions, account.pnl?.unrealizedPnL);
  const chipFlash = useValueFlash(unrealized);
  const chipLabel = formatOpenRiskChipLabel(openCount, unrealized);
  const panelAccount = resolvePanelTradingAccount(
    account.activeTradingAccount,
    account.activeTradingAccountId,
    account.tradingEnvironment,
  );
  const { instances: playbookInstances, refresh: refreshPlaybooks } = usePlaybookInstances(
    panelAccount?.accountId,
  );
  const riskSettings = useRiskSettingsOptional();
  const accountGateStatus = useAccountRiskGateStatus({
    settings: riskSettings?.settings ?? DEFAULT_RISK_SETTINGS,
    accountSummary: account.summary,
    pnl: account.pnl,
    playbookInstances,
    openPositionCount: openCount,
  });

  useEffect(() => {
    registerOpenRiskCount(openCount);
  }, [openCount, registerOpenRiskCount]);

  if (openCount === 0) {
    return null;
  }

  const handleClosePosition = (row: AccountPosition) => {
    if (!panelAccount) return;
    const draft = buildClosePositionDraft({ position: row, account: panelAccount });
    if (!draft) return;
    setCloseDraft(draft);
    onOpenChange(false);
  };

  const handleChart = (symbol: string) => {
    handleLoadSymbol(symbol);
    onOpenChange(false);
  };

  const refreshPlaybookAfterAction = (action: (id: string) => Promise<PlaybookInstance>) => {
    return async (instance: PlaybookInstance) => {
      try {
        await action(instance.id);
        await refreshPlaybooks();
      } catch {
        // leave status visible until next refresh
      }
    };
  };

  const handleDetachPlaybook = refreshPlaybookAfterAction(detachPlaybookInstance);
  const handlePausePlaybook = refreshPlaybookAfterAction(pausePlaybookInstance);
  const handleResumePlaybook = refreshPlaybookAfterAction(resumePlaybookInstance);
  const handleSkipPlaybook = refreshPlaybookAfterAction(skipNextPlaybookRule);

  const handleOpenAccountClick = () => {
    handleOpenAccount();
    onOpenChange(false);
  };

  const environmentLabel =
    account.tradingEnvironment === "live" ? "Live IB" : "Paper IB";
  const connectionMuted =
    account.connectionState !== "connected" ? " · feed stale" : "";

  const chipTone = pnlTone(unrealized);
  const chipToneClass = chipFlash.toneClass || pnlColorClass(unrealized);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-testid="app-header-open-risk"
        data-pnl-tone={chipTone}
        aria-label={`Open positions: ${chipLabel}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`${headerChipClass()} edge-focus-ring min-w-[8.5rem] justify-between gap-2 px-2 ${chipToneClass}`}
        data-flash={chipFlash.flash}
        onClick={() => onOpenChange(!open)}
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${pnlDotClass(unrealized)}`}
          aria-hidden
        />
        <span className={`min-w-0 flex-1 truncate ${bodyTextClass()} tabular-nums`}>{chipLabel}</span>
        <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden className="shrink-0 opacity-70">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>

      <EdgeAnchoredPopover
        open={open}
        anchorRef={triggerRef}
        onClose={() => onOpenChange(false)}
        align="end"
        minWidth={360}
        role="dialog"
        aria-label="Open positions"
      >
        <div
          className="flex max-h-[min(24rem,70vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden bg-[var(--edge-surface-popover)]"
          data-testid="open-risk-positions-popover"
        >
          <div className="flex items-center justify-between border-b border-[var(--edge-border-subtle)] px-3 py-2">
            <div>
              <h2 className={`${bodyTextClass()} font-semibold text-[var(--edge-text-primary)]`}>
                Open risk
              </h2>
              <p className={`${metadataTextClass()} text-[var(--edge-text-secondary)]`}>
                {environmentLabel}
                {connectionMuted}
              </p>
              {accountGateStatus ? (
                <AccountRiskGateStrip status={accountGateStatus} compact />
              ) : null}
            </div>
            <span className={`${annotationTextClass()} tabular-nums ${chipFlash.toneClass}`}>
              {formatSignedMoney(unrealized)}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {openPositions.map((row) => (
              <PositionPopoverRow
                key={`${row.contract.symbol}-${row.position}`}
                row={row}
                onChart={handleChart}
                onClose={handleClosePosition}
                openOrders={account.ordersForActiveAccount}
                onProtect={handleOpenAccountClick}
                manageInstance={
                  panelAccount
                    ? findActivePlaybookForPosition(
                        playbookInstances,
                        row.contract.symbol ?? "",
                        panelAccount.accountId,
                      )
                    : null
                }
                onDetach={(instance) => void handleDetachPlaybook(instance)}
                onPause={(instance) => void handlePausePlaybook(instance)}
                onResume={(instance) => void handleResumePlaybook(instance)}
                onSkip={(instance) => void handleSkipPlaybook(instance)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--edge-border-subtle)] px-3 py-2">
            <EdgeButton
              theme="dark"
              className="!px-2 !py-1 text-[11px]"
              onClick={handleOpenAccountClick}
              data-testid="open-risk-open-account"
            >
              Open Account
            </EdgeButton>
            <Link
              href={WORKSPACE_SURFACE_LINKS.journalOpen}
              className={`${metadataTextClass()} text-[var(--edge-accent-blue)] hover:underline`}
              data-testid="open-risk-journal-opens"
              onClick={() => onOpenChange(false)}
            >
              Journal opens
            </Link>
          </div>
        </div>
      </EdgeAnchoredPopover>

      <ClosePositionConfirmModal
        open={closeDraft != null}
        draft={closeDraft}
        environment={account.tradingEnvironment}
        onClose={() => setCloseDraft(null)}
        onSuccess={() => account.refresh()}
      />
    </>
  );
}

export { countOpenPositions };
