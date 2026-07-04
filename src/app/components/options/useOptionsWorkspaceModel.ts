"use client";

import { useEffect } from "react";
import { useOptionsChainModel, type OptionsChainModel } from "./useOptionsChainModel";
import { useOptionsSession, type OptionsSessionContextValue } from "./OptionsSessionProvider";
import type { OptionsSessionState } from "@/lib/options/optionsSession";

export type OptionsWorkspaceModel = OptionsChainModel &
  Pick<
    OptionsSessionContextValue,
    "setMode" | "patchCalculator" | "setLegs" | "seedFromAnalyze" | "clearSeed"
  > & {
    session: OptionsSessionState;
  };

export function useOptionsWorkspaceModel(): OptionsWorkspaceModel {
  const chain = useOptionsChainModel();
  const sessionCtx = useOptionsSession();

  useEffect(() => {
    sessionCtx.setScope(chain.symbol, chain.primaryExpiration);
  }, [chain.symbol, chain.primaryExpiration, sessionCtx.setScope]);

  return {
    ...chain,
    session: sessionCtx.state,
    setMode: sessionCtx.setMode,
    patchCalculator: sessionCtx.patchCalculator,
    setLegs: sessionCtx.setLegs,
    seedFromAnalyze: sessionCtx.seedFromAnalyze,
    clearSeed: sessionCtx.clearSeed,
  };
}
