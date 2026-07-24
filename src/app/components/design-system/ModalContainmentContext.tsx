"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ModalContainmentMode = "viewport" | "parent";

export type ModalContainmentValue = {
  mode: ModalContainmentMode;
  /** Portal target for parent-scoped modals. When null, falls back to viewport. */
  root: HTMLElement | null;
};

const DEFAULT_CONTAINMENT: ModalContainmentValue = {
  mode: "viewport",
  root: null,
};

const ModalContainmentContext = createContext<ModalContainmentValue>(DEFAULT_CONTAINMENT);

export function ModalContainmentProvider({
  mode,
  root,
  children,
}: {
  mode: ModalContainmentMode;
  root: HTMLElement | null;
  children: ReactNode;
}) {
  return (
    <ModalContainmentContext.Provider value={{ mode, root }}>
      {children}
    </ModalContainmentContext.Provider>
  );
}

export function useModalContainment(): ModalContainmentValue {
  return useContext(ModalContainmentContext);
}
