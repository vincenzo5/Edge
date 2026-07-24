"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type HeaderCenterSlotContextValue = {
  centerSlot: ReactNode;
  registerCenterSlot: (slot: ReactNode) => () => void;
};

const HeaderCenterSlotContext = createContext<HeaderCenterSlotContextValue | null>(null);

export function HeaderCenterSlotProvider({ children }: { children: ReactNode }) {
  const [centerSlot, setCenterSlot] = useState<ReactNode>(null);

  const registerCenterSlot = useCallback((slot: ReactNode) => {
    setCenterSlot(slot);
    return () => {
      setCenterSlot((current) => (current === slot ? null : current));
    };
  }, []);

  return (
    <HeaderCenterSlotContext.Provider value={{ centerSlot, registerCenterSlot }}>
      {children}
    </HeaderCenterSlotContext.Provider>
  );
}

export function useHeaderCenterSlot(): ReactNode {
  const ctx = useContext(HeaderCenterSlotContext);
  return ctx?.centerSlot ?? null;
}

export function useRegisterHeaderCenterSlot(slot: ReactNode): void {
  const ctx = useContext(HeaderCenterSlotContext);

  useEffect(() => {
    if (!ctx) return;
    return ctx.registerCenterSlot(slot);
  }, [ctx, slot]);
}
