import type {
  OptionContractSnapshot,
  OptionExpiration,
  OptionsChainRequest,
  OptionsChainResponse,
} from "../../contracts/options";
import type {
  MassiveOptionChainSnapshot,
  MassiveOptionChainSnapshotResponse,
  MassiveOptionReferenceContract,
  MassiveOptionReferenceContractsResponse,
} from "../../contracts/massive";
import { massiveApiKey, massiveGetPaginated } from "./client";
import {
  dedupeExpirations,
  filterSnapshotsForWindow,
  mapMassiveOptionReferenceToExpiration,
  mapMassiveOptionSnapshotToContract,
  strikeRangeFromWindow,
  uniqueStrikesFromReference,
} from "./optionsMappers";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchReferenceContracts(args: {
  underlying: string;
  expiration?: string;
}): Promise<{ rows: MassiveOptionReferenceContract[]; warnings: string[] }> {
  const params: Record<string, string> = {
    underlying_ticker: args.underlying,
    expired: "false",
    "expiration_date.gte": todayIsoDate(),
    limit: "1000",
    sort: "expiration_date",
    order: "asc",
  };
  if (args.expiration) {
    params.expiration_date = args.expiration;
    delete params["expiration_date.gte"];
  }

  const result = await massiveGetPaginated<MassiveOptionReferenceContractsResponse>(
    "/v3/reference/options/contracts",
    params,
    { allowPlanErrors: true, maxPages: 10 },
  );
  const rows = Array.isArray(result.data.results) ? result.data.results : [];
  return { rows, warnings: result.warnings };
}

async function fetchChainSnapshots(args: {
  underlying: string;
  expiration: string;
  strikeGte?: number;
  strikeLte?: number;
  maxPages?: number;
}): Promise<{ snapshots: MassiveOptionChainSnapshot[]; warnings: string[] }> {
  const params: Record<string, string> = {
    expiration_date: args.expiration,
    limit: "250",
    sort: "strike_price",
    order: "asc",
  };
  if (args.strikeGte != null) {
    params["strike_price.gte"] = String(args.strikeGte);
  }
  if (args.strikeLte != null) {
    params["strike_price.lte"] = String(args.strikeLte);
  }

  const result = await massiveGetPaginated<MassiveOptionChainSnapshotResponse>(
    `/v3/snapshot/options/${encodeURIComponent(args.underlying)}`,
    params,
    { allowPlanErrors: true, maxPages: args.maxPages ?? 20 },
  );
  const snapshots = Array.isArray(result.data.results) ? result.data.results : [];
  return { snapshots, warnings: result.warnings };
}

export function createMassiveOptionsProvider() {
  return {
    isConfigured(): boolean {
      return massiveApiKey() != null;
    },

    async getOptionExpirationsWithWarnings(underlying: string): Promise<{
      expirations: OptionExpiration[];
      warnings: string[];
    }> {
      if (!this.isConfigured()) {
        return {
          expirations: [],
          warnings: ["MASSIVE_API_KEY is not configured"],
        };
      }

      const sym = underlying.trim().toUpperCase();
      try {
        const { rows, warnings } = await fetchReferenceContracts({ underlying: sym });
        const expirations = dedupeExpirations(
          rows
            .map((row) => mapMassiveOptionReferenceToExpiration(row, sym))
            .filter((row): row is OptionExpiration => row != null),
        );
        if (expirations.length === 0 && warnings.length === 0) {
          warnings.push(`Massive returned no option expirations for ${sym}`);
        }
        return { expirations, warnings };
      } catch (error) {
        return {
          expirations: [],
          warnings: [
            error instanceof Error
              ? `Massive option expirations failed: ${error.message}`
              : "Massive option expirations failed",
          ],
        };
      }
    },

    async getOptionsChainWithWarnings(request: OptionsChainRequest): Promise<{
      chain: OptionsChainResponse;
      warnings: string[];
    }> {
      const warnings: string[] = [];
      const underlying = request.underlying.trim().toUpperCase();
      const expiration = request.expiration?.trim() ?? "";

      if (!this.isConfigured()) {
        return {
          chain: { underlying, expiration, contracts: [] },
          warnings: ["MASSIVE_API_KEY is not configured"],
        };
      }
      if (!expiration) {
        return {
          chain: { underlying, expiration: "", contracts: [] },
          warnings: ["expiration is required for Massive options chain"],
        };
      }

      try {
        let strikeGte: number | undefined;
        let strikeLte: number | undefined;
        const strikeWindow = request.strikeWindow;

        if (strikeWindow && strikeWindow.mode === "atm") {
          const reference = await fetchReferenceContracts({
            underlying,
            expiration,
          });
          warnings.push(...reference.warnings);
          const strikes = uniqueStrikesFromReference(reference.rows);
          const range = strikeRangeFromWindow(strikes, strikeWindow);
          strikeGte = range.gte;
          strikeLte = range.lte;
        }

        const snapshotResult = await fetchChainSnapshots({
          underlying,
          expiration,
          strikeGte,
          strikeLte,
          maxPages: strikeWindow?.mode === "full" ? 20 : 4,
        });
        warnings.push(...snapshotResult.warnings);

        let snapshots = snapshotResult.snapshots;
        if (strikeWindow && strikeWindow.mode === "atm") {
          snapshots = filterSnapshotsForWindow(snapshots, request);
        }

        const contracts: OptionContractSnapshot[] = [];
        for (const row of snapshots) {
          const mapped = mapMassiveOptionSnapshotToContract(row, underlying, expiration);
          if (mapped) contracts.push(mapped);
        }

        contracts.sort((a, b) => a.strike - b.strike || a.type.localeCompare(b.type));

        if (contracts.length === 0 && warnings.length === 0) {
          warnings.push(`Massive returned no contracts for ${underlying} ${expiration}`);
        }

        return {
          chain: { underlying, expiration, contracts },
          warnings,
        };
      } catch (error) {
        return {
          chain: { underlying, expiration, contracts: [] },
          warnings: [
            error instanceof Error
              ? `Massive options chain failed: ${error.message}`
              : "Massive options chain failed",
          ],
        };
      }
    },
  };
}

export type MassiveOptionsProvider = ReturnType<typeof createMassiveOptionsProvider>;
