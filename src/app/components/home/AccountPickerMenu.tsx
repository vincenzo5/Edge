"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EdgeIconButton from "../design-system/EdgeIconButton";
import { SettingsIcon } from "../chart-chrome/ChartHeaderIcons";
import {
  accountPickerLabel,
  tradingAccountKey,
} from "@/lib/trading/accountPickerOptions";
import type { TradingAccount } from "@/lib/trading/types";
import type { AccountAliases } from "@/lib/trading/accountAliases";
import AccountAliasEditor from "./AccountAliasEditor";

type Props = {
  accounts: TradingAccount[];
  aliases: AccountAliases;
  selectedAccount: TradingAccount | null;
  loading: boolean;
  onSelectAccount: (account: TradingAccount) => void;
  onSetAlias: (account: TradingAccount, alias: string) => void;
};

export default function AccountPickerMenu({
  accounts,
  aliases,
  selectedAccount,
  loading,
  onSelectAccount,
  onSetAlias,
}: Props) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedKey = selectedAccount ? tradingAccountKey(selectedAccount) : "";
  const selectedLabel = selectedAccount
    ? accountPickerLabel(selectedAccount, aliases)
    : loading
      ? "Loading accounts…"
      : "No accounts";

  const close = useCallback(() => {
    setOpen(false);
    setSettingsOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (settingsOpen) setSettingsOpen(false);
        else close();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, settingsOpen, close]);

  const handleSelect = (account: TradingAccount) => {
    onSelectAccount(account);
    close();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id="app-account-picker"
        data-testid="app-account-picker"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={loading || accounts.length === 0}
        className="edge-focus-ring flex max-w-[14rem] items-center gap-1 rounded border border-[var(--edge-border)] bg-transparent px-2 py-1 text-xs text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0 flex-1 truncate text-left">{selectedLabel}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden
          className={`shrink-0 text-[var(--edge-text-secondary)] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          data-testid="app-account-picker-menu"
          className="edge-popover absolute right-0 top-full z-50 mt-1 flex overflow-hidden rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] shadow-lg"
          role="listbox"
          aria-label="Trading accounts"
        >
          <div className="min-w-[10rem] max-w-[14rem] py-1">
            {accounts.map((row) => {
              const key = tradingAccountKey(row);
              const isSelected = key === selectedKey;
              return (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-testid={`app-account-picker-option-${key}`}
                  className={`edge-focus-ring flex w-full items-center px-3 py-1.5 text-left text-xs hover:bg-[var(--edge-surface-hover)] ${
                    isSelected
                      ? "bg-[var(--edge-surface-active)] text-[var(--edge-text-strong)]"
                      : "text-[var(--edge-text-primary)]"
                  }`}
                  onClick={() => handleSelect(row)}
                >
                  <span className="truncate">{accountPickerLabel(row, aliases)}</span>
                </button>
              );
            })}
          </div>
          <div
            className={`flex shrink-0 border-l border-[var(--edge-border)] ${
              settingsOpen ? "w-[min(16rem,calc(100vw-8rem))]" : "w-8"
            }`}
          >
            {settingsOpen ? (
              <AccountAliasEditor
                accounts={accounts}
                aliases={aliases}
                onSetAlias={onSetAlias}
                onClose={() => setSettingsOpen(false)}
              />
            ) : (
              <div className="flex w-full justify-center py-1">
                <EdgeIconButton
                  theme="dark"
                  size="sm"
                  aria-label="Account display settings"
                  data-testid="app-account-aliases-settings"
                  onClick={() => setSettingsOpen(true)}
                >
                  <SettingsIcon size={14} />
                </EdgeIconButton>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
