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
};

const HeaderCenterSlotContext = createContext<HeaderCenterSlotContextValue | null>(null);
const HeaderCenterSlotRegistrationContext = createContext<
  ((slot: ReactNode) => () => void) | null
>(null);

export function HeaderCenterSlotProvider({ children }: { children: ReactNode }) {
  const [centerSlot, setCenterSlot] = useState<ReactNode>(null);

  const registerCenterSlot = useCallback((slot: ReactNode) => {
    setCenterSlot(slot);
    return () => {
      setCenterSlot((current) => (current === slot ? null : current));
    };
  }, []);

  return (
    <HeaderCenterSlotRegistrationContext.Provider value={registerCenterSlot}>
      <HeaderCenterSlotContext.Provider value={{ centerSlot }}>
        {children}
      </HeaderCenterSlotContext.Provider>
    </HeaderCenterSlotRegistrationContext.Provider>
  );
}

export function useHeaderCenterSlot(): ReactNode {
  const ctx = useContext(HeaderCenterSlotContext);
  return ctx?.centerSlot ?? null;
}

export function useRegisterHeaderCenterSlot(slot: ReactNode): void {
  const registerCenterSlot = useContext(HeaderCenterSlotRegistrationContext);

  useEffect(() => {
    if (!registerCenterSlot) return;
    return registerCenterSlot(slot);
  }, [registerCenterSlot, slot]);
}
