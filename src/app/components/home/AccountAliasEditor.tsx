"use client";

import { tradingAccountKey } from "@/lib/trading/accountPickerOptions";
import type { TradingAccount } from "@/lib/trading/types";
import type { AccountAliases } from "@/lib/trading/accountAliases";
import { annotationTextClass, fieldClass, linkActionClass } from "../design-system/styles";

type Props = {
  accounts: TradingAccount[];
  aliases: AccountAliases;
  onSetAlias: (account: TradingAccount, alias: string) => void;
  onClose?: () => void;
};

function accountEnvironmentLabel(account: TradingAccount): string {
  if (account.availability === "offline") return "live, offline";
  return account.environment;
}

export default function AccountAliasEditor({
  accounts,
  aliases,
  onSetAlias,
  onClose,
}: Props) {
  return (
    <div
      role="dialog"
      aria-label="Account display names"
      data-testid="app-account-aliases-popover"
      className="flex h-full min-h-0 flex-col p-2"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className={`${annotationTextClass()} font-semibold text-[var(--edge-text-strong)]`}>
          Display names
        </div>
        {onClose ? (
          <button
            type="button"
            aria-label="Back to accounts"
            data-testid="app-account-aliases-back"
            className={linkActionClass()}
            onClick={onClose}
          >
            Back
          </button>
        ) : null}
      </div>
      {accounts.length === 0 ? (
        <p className={`${annotationTextClass()} text-[var(--edge-text-secondary)]`}>No accounts loaded.</p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-3 overflow-y-auto">
          {accounts.map((row) => {
            const key = tradingAccountKey(row);
            return (
              <li key={key} data-testid={`account-alias-row-${key}`}>
                <label className={`block ${annotationTextClass()} text-[var(--edge-text-secondary)]`}>
                  Display name
                  <input
                    type="text"
                    data-testid={`account-alias-input-${key}`}
                    className={`mt-1 ${fieldClass({ density: "compact" })}`}
                    placeholder={row.accountId}
                    value={aliases[key] ?? ""}
                    onChange={(event) => onSetAlias(row, event.target.value)}
                    onBlur={(event) => onSetAlias(row, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </label>
                <div className={`mt-1 ${annotationTextClass()} text-[var(--edge-text-muted)]`}>
                  {row.accountId} · {accountEnvironmentLabel(row)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
