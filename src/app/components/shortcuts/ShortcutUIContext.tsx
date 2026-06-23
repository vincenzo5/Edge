"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

export type QuickSearchHandlers = {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
};

type ShortcutUIContextValue = {
  registerQuickSearch: (handlers: QuickSearchHandlers | null) => void;
  getQuickSearch: () => QuickSearchHandlers | null;
};

const ShortcutUIContext = createContext<ShortcutUIContextValue | null>(null);

export function ShortcutUIProvider({ children }: { children: ReactNode }) {
  const quickSearchRef = useRef<QuickSearchHandlers | null>(null);

  const registerQuickSearch = useCallback((handlers: QuickSearchHandlers | null) => {
    quickSearchRef.current = handlers;
  }, []);

  const getQuickSearch = useCallback(() => quickSearchRef.current, []);

  const value = useMemo(
    () => ({ registerQuickSearch, getQuickSearch }),
    [registerQuickSearch, getQuickSearch],
  );

  return (
    <ShortcutUIContext.Provider value={value}>{children}</ShortcutUIContext.Provider>
  );
}

export function useShortcutUI(): ShortcutUIContextValue {
  const ctx = useContext(ShortcutUIContext);
  if (!ctx) {
    throw new Error("useShortcutUI must be used within ShortcutUIProvider");
  }
  return ctx;
}

export function useShortcutUIOptional(): ShortcutUIContextValue | null {
  return useContext(ShortcutUIContext);
}
