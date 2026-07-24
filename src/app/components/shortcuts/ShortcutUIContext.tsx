"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type OverlayHandlers = {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
};

type ShortcutUIContextValue = {
  registerCommandPalette: (handlers: OverlayHandlers | null) => void;
  getCommandPalette: () => OverlayHandlers | null;
  registerSymbolSearch: (handlers: OverlayHandlers | null) => void;
  getSymbolSearch: () => OverlayHandlers | null;
  registerThemeToggle: (handler: (() => void) | null) => void;
  getThemeToggle: () => (() => void) | null;
  registerOpenPositionsMenu: (handlers: OverlayHandlers | null) => void;
  getOpenPositionsMenu: () => OverlayHandlers | null;
  registerOpenPositionsAvailability: (handler: (() => boolean) | null) => void;
  getOpenPositionsAvailability: () => (() => boolean) | null;
  /** Bumps when overlay handlers register so palette rebuilds command list. */
  registrationVersion: number;
};

const ShortcutUIContext = createContext<ShortcutUIContextValue | null>(null);

export function ShortcutUIProvider({ children }: { children: ReactNode }) {
  const commandPaletteRef = useRef<OverlayHandlers | null>(null);
  const symbolSearchRef = useRef<OverlayHandlers | null>(null);
  const themeToggleRef = useRef<(() => void) | null>(null);
  const openPositionsMenuRef = useRef<OverlayHandlers | null>(null);
  const openPositionsAvailabilityRef = useRef<(() => boolean) | null>(null);
  const [registrationVersion, setRegistrationVersion] = useState(0);

  const bumpRegistration = useCallback(() => {
    setRegistrationVersion((version) => version + 1);
  }, []);

  const registerCommandPalette = useCallback(
    (handlers: OverlayHandlers | null) => {
      commandPaletteRef.current = handlers;
      bumpRegistration();
    },
    [bumpRegistration],
  );

  const getCommandPalette = useCallback(() => commandPaletteRef.current, []);

  const registerSymbolSearch = useCallback(
    (handlers: OverlayHandlers | null) => {
      symbolSearchRef.current = handlers;
      bumpRegistration();
    },
    [bumpRegistration],
  );

  const getSymbolSearch = useCallback(() => symbolSearchRef.current, []);

  const registerThemeToggle = useCallback(
    (handler: (() => void) | null) => {
      themeToggleRef.current = handler;
      bumpRegistration();
    },
    [bumpRegistration],
  );

  const getThemeToggle = useCallback(() => themeToggleRef.current, []);

  const registerOpenPositionsMenu = useCallback(
    (handlers: OverlayHandlers | null) => {
      openPositionsMenuRef.current = handlers;
      bumpRegistration();
    },
    [bumpRegistration],
  );

  const getOpenPositionsMenu = useCallback(() => openPositionsMenuRef.current, []);

  const registerOpenPositionsAvailability = useCallback(
    (handler: (() => boolean) | null) => {
      openPositionsAvailabilityRef.current = handler;
      bumpRegistration();
    },
    [bumpRegistration],
  );

  const getOpenPositionsAvailability = useCallback(
    () => openPositionsAvailabilityRef.current,
    [],
  );

  const value = useMemo(
    () => ({
      registerCommandPalette,
      getCommandPalette,
      registerSymbolSearch,
      getSymbolSearch,
      registerThemeToggle,
      getThemeToggle,
      registerOpenPositionsMenu,
      getOpenPositionsMenu,
      registerOpenPositionsAvailability,
      getOpenPositionsAvailability,
      registrationVersion,
    }),
    [
      registerCommandPalette,
      getCommandPalette,
      registerSymbolSearch,
      getSymbolSearch,
      registerThemeToggle,
      getThemeToggle,
      registerOpenPositionsMenu,
      getOpenPositionsMenu,
      registerOpenPositionsAvailability,
      getOpenPositionsAvailability,
      registrationVersion,
    ],
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
