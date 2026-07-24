"use client";

import type { ReactNode } from "react";

import { AccountAliasesProvider } from "../AccountAliasesProvider";
import { AccountProvider } from "../AccountProvider";
import { AppThemeProvider } from "../AppThemeProvider";
import { AppTimeZoneProvider } from "../AppTimeZoneProvider";
import { UserPreferencesSyncProvider } from "../UserPreferencesSyncProvider";
import { AppChromeActionsProvider } from "./AppChromeActionsProvider";
import { NotificationProvider } from "../notifications/NotificationProvider";

type Props = {
  children: ReactNode;
};

/** Shared app chrome providers — theme through notifications. Used by AppModuleShell and density layout. */
export default function AppChromeProviders({ children }: Props) {
  return (
    <AppThemeProvider>
      <AppTimeZoneProvider>
        <UserPreferencesSyncProvider>
          <AccountProvider>
            <AccountAliasesProvider>
              <AppChromeActionsProvider>
                <NotificationProvider>{children}</NotificationProvider>
              </AppChromeActionsProvider>
            </AccountAliasesProvider>
          </AccountProvider>
        </UserPreferencesSyncProvider>
      </AppTimeZoneProvider>
    </AppThemeProvider>
  );
}
