import type {
  OptionContractSnapshot,
  OptionExpiration,
  OptionsChainRequest,
  OptionsChainResponse,
} from "../../contracts/options";
import { optionContractSnapshotSchema } from "../../schemas/response";
import { asFiniteNumber } from "../../validation/parseRequest";
import { createTwsClient, isTwsConfigured, type TwsClient } from "./client";

function validateContract(
  contract: OptionContractSnapshot,
  warnings: string[],
): OptionContractSnapshot | null {
  const parsed = optionContractSnapshotSchema.safeParse(contract);
  if (parsed.success) return parsed.data;
  warnings.push(
    `Dropped malformed TWS option ${contract.contractSymbol}: ${parsed.error.issues[0]?.message ?? "validation failed"}`,
  );
  return null;
}

export function createTwsOptionsProvider(client?: TwsClient) {
  const tws = client ?? (isTwsConfigured() ? createTwsClient() : null);

  return {
    isConfigured(): boolean {
      return tws != null;
    },

    async getExpirations(underlying: string): Promise<{
      expirations: OptionExpiration[];
      warnings: string[];
    }> {
      if (!tws) {
        return { expirations: [], warnings: ["TWS not configured"] };
      }
      const sym = underlying.trim().toUpperCase();
      try {
        const result = await tws.getOptionExpirations(sym);
        return {
          expirations: result.expirations.map((row) => ({
            underlying: row.underlying,
            expiration: row.expiration,
          })),
          warnings: result.warnings,
        };
      } catch (error) {
        return {
          expirations: [],
          warnings: [error instanceof Error ? error.message : "TWS option expirations failed"],
        };
      }
    },

    async getChain(request: OptionsChainRequest): Promise<{
      chain: OptionsChainResponse;
      warnings: string[];
    }> {
      const warnings: string[] = [];
      const underlying = request.underlying.trim().toUpperCase();
      const expiration = request.expiration ?? "";
      if (!tws) {
        return {
          chain: { underlying, expiration, contracts: [] },
          warnings: ["TWS not configured"],
        };
      }
      if (!expiration) {
        return {
          chain: { underlying, expiration: "", contracts: [] },
          warnings: ["expiration is required for TWS options chain"],
        };
      }
      try {
        const result = await tws.getOptionsChain({
          underlying,
          expiration,
          strikeWindow: request.strikeWindow,
        });
        const contracts: OptionContractSnapshot[] = [];
        for (const row of result.chain.contracts ?? []) {
          const mapped: OptionContractSnapshot = {
            contractSymbol: row.contractSymbol,
            underlying: row.underlying,
            type: row.type,
            expiration: row.expiration,
            strike: row.strike,
            bid: asFiniteNumber(row.bid),
            ask: asFiniteNumber(row.ask),
            last: asFiniteNumber(row.last),
            mark: asFiniteNumber(row.mark),
            volume: asFiniteNumber(row.volume),
            openInterest: asFiniteNumber(row.openInterest),
            impliedVolatility: asFiniteNumber(row.impliedVolatility),
            delta: asFiniteNumber(row.delta),
            gamma: asFiniteNumber(row.gamma),
            theta: asFiniteNumber(row.theta),
            vega: asFiniteNumber(row.vega),
            updatedAt: row.updatedAt ?? Date.now(),
          };
          const validated = validateContract(mapped, warnings);
          if (validated) contracts.push(validated);
        }
        return {
          chain: { underlying, expiration, contracts },
          warnings: [...warnings, ...(result.warnings ?? [])],
        };
      } catch (error) {
        return {
          chain: { underlying, expiration, contracts: [] },
          warnings: [error instanceof Error ? error.message : "TWS options chain failed"],
        };
      }
    },
  };
}

export type TwsOptionsProvider = ReturnType<typeof createTwsOptionsProvider>;
