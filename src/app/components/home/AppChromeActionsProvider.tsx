"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

export type OpenRiskWorkspaceBridge = {
  openAccountPanel: () => void;
  loadSymbolIntoActiveChart: (symbol: string) => void;
};

type AppChromeActionsContextValue = {
  settingsOpen: boolean;
  openAppSettings: () => void;
  closeAppSettings: () => void;
  settingsTriggerRef: RefObject<HTMLButtonElement | null>;
  orderAccountMenuOpen: boolean;
  openOrderAccountMenu: () => void;
  closeOrderAccountMenu: () => void;
  marketDataMenuOpen: boolean;
  openMarketDataMenu: () => void;
  closeMarketDataMenu: () => void;
  positionsMenuOpen: boolean;
  openPositionsMenu: () => void;
  closePositionsMenu: () => void;
  togglePositionsMenu: () => void;
  notificationsMenuOpen: boolean;
  openNotificationsMenu: () => void;
  closeNotificationsMenu: () => void;
  registerOpenRiskWorkspaceBridge: (bridge: OpenRiskWorkspaceBridge | null) => void;
  registerOpenRiskCount: (count: number) => void;
  openAccountPanel: () => void;
  loadSymbolIntoActiveChart: (symbol: string) => void;
  hasOpenPositions: () => boolean;
  openPositionsMenuIfAvailable: () => void;
};

const AppChromeActionsContext = createContext<AppChromeActionsContextValue | null>(null);

export function AppChromeActionsProvider({ children }: { children: ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [orderAccountMenuOpen, setOrderAccountMenuOpen] = useState(false);
  const [marketDataMenuOpen, setMarketDataMenuOpen] = useState(false);
  const [positionsMenuOpen, setPositionsMenuOpen] = useState(false);
  const [notificationsMenuOpen, setNotificationsMenuOpen] = useState(false);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const openRiskBridgeRef = useRef<OpenRiskWorkspaceBridge | null>(null);
  const openRiskCountRef = useRef(0);

  const openAppSettings = useCallback(() => setSettingsOpen(true), []);
  const closeAppSettings = useCallback(() => setSettingsOpen(false), []);
  const openOrderAccountMenu = useCallback(() => setOrderAccountMenuOpen(true), []);
  const closeOrderAccountMenu = useCallback(() => setOrderAccountMenuOpen(false), []);
  const openMarketDataMenu = useCallback(() => setMarketDataMenuOpen(true), []);
  const closeMarketDataMenu = useCallback(() => setMarketDataMenuOpen(false), []);
  const openNotificationsMenu = useCallback(() => setNotificationsMenuOpen(true), []);
  const closeNotificationsMenu = useCallback(() => setNotificationsMenuOpen(false), []);
  const openPositionsMenu = useCallback(() => setPositionsMenuOpen(true), []);
  const closePositionsMenu = useCallback(() => setPositionsMenuOpen(false), []);
  const togglePositionsMenu = useCallback(
    () => setPositionsMenuOpen((open) => !open),
    [],
  );

  const registerOpenRiskWorkspaceBridge = useCallback((bridge: OpenRiskWorkspaceBridge | null) => {
    openRiskBridgeRef.current = bridge;
  }, []);

  const openAccountPanel = useCallback(() => {
    openRiskBridgeRef.current?.openAccountPanel();
  }, []);

  const loadSymbolIntoActiveChart = useCallback((symbol: string) => {
    openRiskBridgeRef.current?.loadSymbolIntoActiveChart(symbol);
  }, []);

  const hasOpenPositions = useCallback(() => openRiskCountRef.current > 0, []);

  const registerOpenRiskCount = useCallback((count: number) => {
    openRiskCountRef.current = count;
  }, []);

  const openPositionsMenuIfAvailable = useCallback(() => {
    if (openRiskCountRef.current > 0) {
      setPositionsMenuOpen(true);
    }
  }, []);

  const value = useMemo(
    (): AppChromeActionsContextValue => ({
      settingsOpen,
      openAppSettings,
      closeAppSettings,
      settingsTriggerRef,
      orderAccountMenuOpen,
      openOrderAccountMenu,
      closeOrderAccountMenu,
      marketDataMenuOpen,
      openMarketDataMenu,
      closeMarketDataMenu,
      positionsMenuOpen,
      openPositionsMenu,
      closePositionsMenu,
      togglePositionsMenu,
      notificationsMenuOpen,
      openNotificationsMenu,
      closeNotificationsMenu,
      registerOpenRiskWorkspaceBridge,
      registerOpenRiskCount,
      openAccountPanel,
      loadSymbolIntoActiveChart,
      hasOpenPositions,
      openPositionsMenuIfAvailable,
    }),
    [
      settingsOpen,
      openAppSettings,
      closeAppSettings,
      orderAccountMenuOpen,
      openOrderAccountMenu,
      closeOrderAccountMenu,
      marketDataMenuOpen,
      openMarketDataMenu,
      closeMarketDataMenu,
      positionsMenuOpen,
      openPositionsMenu,
      closePositionsMenu,
      togglePositionsMenu,
      notificationsMenuOpen,
      openNotificationsMenu,
      closeNotificationsMenu,
      registerOpenRiskWorkspaceBridge,
      registerOpenRiskCount,
      openAccountPanel,
      loadSymbolIntoActiveChart,
      hasOpenPositions,
      openPositionsMenuIfAvailable,
    ],
  );

  return (
    <AppChromeActionsContext.Provider value={value}>{children}</AppChromeActionsContext.Provider>
  );
}

export function useAppChromeActions(): AppChromeActionsContextValue {
  const ctx = useContext(AppChromeActionsContext);
  if (!ctx) {
    throw new Error("useAppChromeActions must be used within AppChromeActionsProvider");
  }
  return ctx;
}
