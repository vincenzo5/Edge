"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import { useElementSize } from "@/lib/responsive/useElementSize";
import {
  resolveTileDensityMode,
  type TileDensityMode,
} from "@/lib/responsive/tileDensity";

export type TileDensityState = {
  mode: TileDensityMode;
  width: number;
};

const TileDensityContext = createContext<TileDensityState | null>(null);

export function TileDensityProvider({ children }: { children: ReactNode }) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const previousModeRef = useRef<TileDensityMode>("wide");

  const mode = useMemo(() => {
    const next = resolveTileDensityMode(size.width, previousModeRef.current);
    previousModeRef.current = next;
    return next;
  }, [size.width]);

  const value = useMemo(
    () => ({ mode, width: size.width }),
    [mode, size.width],
  );

  return (
    <TileDensityContext.Provider value={value}>
      <div
        ref={ref}
        data-testid="tile-density-root"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        {children}
      </div>
    </TileDensityContext.Provider>
  );
}

/** Fixed density for unit tests. */
export function TileDensityOverrideProvider({
  mode,
  width,
  children,
}: {
  mode: TileDensityMode;
  width: number;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ mode, width }), [mode, width]);
  return (
    <TileDensityContext.Provider value={value}>{children}</TileDensityContext.Provider>
  );
}

export function useTileDensity(): TileDensityState {
  const ctx = useContext(TileDensityContext);
  if (!ctx) {
    return { mode: "wide", width: 9999 };
  }
  return ctx;
}

export function useTileDensityOptional(): TileDensityState | null {
  return useContext(TileDensityContext);
}
