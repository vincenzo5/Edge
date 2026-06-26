import type {
  OptionContractSnapshot,
  OptionExpiration,
  OptionsChainRequest,
  OptionsChainResponse,
  OptionsStrikeWindow,
} from "../../contracts/options";
import { optionContractSnapshotSchema } from "../../schemas/response";
import { asFiniteNumber, asNonEmptyString } from "../../validation/parseRequest";
import type { IbkrContractResolver } from "./contractResolver";
import { createContractResolver } from "./contractResolver";
import {
  createIbkrClient,
  isIbkrConfigured,
  type IbkrClient,
  type IbkrOptionInfoRow,
  type IbkrSnapshotRow,
} from "./client";

const IBKR_MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

/** YYYY-MM-DD → IBKR month token (e.g. JUN25). */
export function expirationToIbkrMonth(expiration: string): string | null {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(expiration.trim());
  if (!match) return null;
  const year = match[1]!;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return `${IBKR_MONTHS[monthIndex]}${year.slice(2)}`;
}

/** IBKR maturityDate (YYYYMMDD) → YYYY-MM-DD. */
export function ibkrMaturityToExpiration(maturityDate: string): string | null {
  const raw = maturityDate.trim();
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return null;
}

function parseSnapshotField(row: IbkrSnapshotRow, field: string): number | null {
  const raw = row[field];
  if (raw == null) return null;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/^[+]/, "").replace(/,/g, "").replace(/%$/i, "").trim();
    if (cleaned === "" || cleaned === "-") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return asFiniteNumber(raw);
}

function mapIbkrRight(right: unknown): "call" | "put" | null {
  const raw = asNonEmptyString(right)?.toUpperCase();
  if (raw === "C" || raw === "CALL") return "call";
  if (raw === "P" || raw === "PUT") return "put";
  return null;
}

function unionStrikes(call: number[] = [], put: number[] = []): number[] {
  return [...new Set([...call, ...put])].sort((a, b) => a - b);
}

function sampleStrikesForExpirationDiscovery(strikes: number[]): number[] {
  if (strikes.length === 0) return [];
  const samples = new Set<number>();
  samples.add(strikes[0]!);
  samples.add(strikes[Math.floor(strikes.length / 2)] ?? strikes[0]!);
  return [...samples];
}

function selectStrikesForChain(
  allStrikes: number[],
  strikeWindow: OptionsStrikeWindow | undefined,
): number[] {
  if (!strikeWindow || strikeWindow.mode === "full") return allStrikes;
  const count = strikeWindow.count ?? 20;
  const half = Math.ceil(count / 2);
  const spot = strikeWindow.spot;
  if (spot == null || !Number.isFinite(spot)) {
    const mid = Math.floor(allStrikes.length / 2);
    const start = Math.max(0, mid - half);
    return allStrikes.slice(start, start + count);
  }
  const ranked = [...allStrikes].sort(
    (a, b) => Math.abs(a - spot) - Math.abs(b - spot),
  );
  return ranked.slice(0, count);
}

function buildOccContractSymbol(
  underlying: string,
  maturityDate: string,
  type: "call" | "put",
  strike: number,
): string {
  const yymmdd =
    maturityDate.length === 8
      ? maturityDate.slice(2)
      : maturityDate.replace(/-/g, "").slice(2);
  const right = type === "call" ? "C" : "P";
  const strikePart = String(Math.round(strike * 1000)).padStart(8, "0");
  return `${underlying}${yymmdd}${right}${strikePart}`;
}

export function mapIbkrOptionContract(
  info: IbkrOptionInfoRow,
  underlying: string,
  expiration: string,
  snapshot?: IbkrSnapshotRow,
): OptionContractSnapshot | null {
  const type = mapIbkrRight(info.right);
  const strike = asFiniteNumber(info.strike);
  const maturity = asNonEmptyString(info.maturityDate);
  const contractSymbol =
    asNonEmptyString(info.desc2) ??
    (maturity && type && strike != null
      ? buildOccContractSymbol(underlying, maturity, type, strike)
      : null) ??
    asNonEmptyString(info.symbol);
  if (!type || strike == null || strike <= 0 || !contractSymbol) return null;

  const bid = snapshot ? parseSnapshotField(snapshot, "84") : null;
  const ask = snapshot ? parseSnapshotField(snapshot, "86") : null;
  const last = snapshot ? parseSnapshotField(snapshot, "31") : null;
  const mark = bid != null && ask != null ? (bid + ask) / 2 : last;

  return {
    contractSymbol,
    underlying,
    type,
    expiration,
    strike,
    bid,
    ask,
    last,
    mark,
    volume: snapshot ? parseSnapshotField(snapshot, "87") : null,
    openInterest: snapshot ? parseSnapshotField(snapshot, "7638") : null,
    impliedVolatility: snapshot ? parseSnapshotField(snapshot, "7633") : null,
    delta: snapshot ? parseSnapshotField(snapshot, "7308") : null,
    gamma: snapshot ? parseSnapshotField(snapshot, "7309") : null,
    theta: snapshot ? parseSnapshotField(snapshot, "7310") : null,
    vega: snapshot ? parseSnapshotField(snapshot, "7311") : null,
    updatedAt: Date.now(),
  };
}

function validateContract(
  contract: OptionContractSnapshot,
  warnings: string[],
): OptionContractSnapshot | null {
  const parsed = optionContractSnapshotSchema.safeParse(contract);
  if (parsed.success) return parsed.data;
  warnings.push(
    `Dropped malformed IBKR option ${contract.contractSymbol}: ${parsed.error.issues[0]?.message ?? "validation failed"}`,
  );
  return null;
}

const SNAPSHOT_BATCH_SIZE = 40;

export function createIbkrOptionsProvider(
  client?: IbkrClient,
  resolver?: IbkrContractResolver,
) {
  const ibkr = client ?? (isIbkrConfigured() ? createIbkrClient() : null);
  const contractResolver = resolver ?? (ibkr ? createContractResolver(ibkr) : null);

  async function resolveUnderlying(underlying: string) {
    if (!contractResolver) return null;
    await ibkr?.ensureSessionForMarketData();
    return contractResolver.resolveOptionsUnderlying(underlying);
  }

  return {
    isConfigured(): boolean {
      return ibkr != null;
    },

    async getExpirations(underlying: string): Promise<{
      expirations: OptionExpiration[];
      warnings: string[];
    }> {
      const warnings: string[] = [];
      const resolved = await resolveUnderlying(underlying);
      if (!resolved || !ibkr || !contractResolver) {
        return { expirations: [], warnings: ["IBKR could not resolve underlying options"] };
      }

      if (resolved.months.length === 0) {
        warnings.push("IBKR secdef returned no option months for underlying");
        return { expirations: [], warnings };
      }

      const dates = new Set<string>();
      for (const month of resolved.months) {
        try {
          const strikes = await contractResolver.getCachedOptionStrikes(
            resolved.optionsConid,
            month,
          );
          const samples = sampleStrikesForExpirationDiscovery(
            unionStrikes(strikes.call, strikes.put),
          );
          if (samples.length === 0) continue;

          for (const sample of samples) {
            for (const right of ["C", "P"] as const) {
              const infoRows = await contractResolver.getCachedOptionContractInfo(
                resolved.optionsConid,
                month,
                sample,
                right,
              );
              for (const row of infoRows) {
                const maturity = asNonEmptyString(row.maturityDate);
                const expiration = maturity ? ibkrMaturityToExpiration(maturity) : null;
                if (expiration) dates.add(expiration);
              }
            }
          }
        } catch (error) {
          warnings.push(
            error instanceof Error
              ? `IBKR expirations month ${month}: ${error.message}`
              : `IBKR expirations month ${month} failed`,
          );
        }
      }

      const expirations = [...dates]
        .sort()
        .map((expiration) => ({
          underlying: resolved.symbol,
          expiration,
        }));

      if (expirations.length === 0) {
        warnings.push("IBKR returned no option expirations");
      }

      return { expirations, warnings };
    },

    async getChain(request: OptionsChainRequest): Promise<{
      chain: OptionsChainResponse;
      warnings: string[];
    }> {
      const warnings: string[] = [];
      const underlying = request.underlying.trim().toUpperCase();
      const expiration = request.expiration?.trim() ?? "";
      if (!expiration) {
        return {
          chain: { underlying, expiration: "", contracts: [] },
          warnings: ["expiration is required for IBKR options chain"],
        };
      }

      const ibkrMonth = expirationToIbkrMonth(expiration);
      if (!ibkrMonth) {
        return {
          chain: { underlying, expiration, contracts: [] },
          warnings: [`Invalid expiration format for IBKR: ${expiration}`],
        };
      }

      const resolved = await resolveUnderlying(underlying);
      if (!resolved || !ibkr || !contractResolver) {
        return {
          chain: { underlying, expiration, contracts: [] },
          warnings: ["IBKR could not resolve underlying options"],
        };
      }

      if (!resolved.months.includes(ibkrMonth)) {
        warnings.push(`IBKR month ${ibkrMonth} not listed for ${underlying}`);
      }

      const maturityKey = expiration.replace(/-/g, "");
      let strikesResponse;
      try {
        strikesResponse = await contractResolver.getCachedOptionStrikes(
          resolved.optionsConid,
          ibkrMonth,
        );
      } catch (error) {
        return {
          chain: { underlying, expiration, contracts: [] },
          warnings: [
            error instanceof Error
              ? `IBKR strikes failed: ${error.message}`
              : "IBKR strikes failed",
          ],
        };
      }

      const allStrikes = unionStrikes(strikesResponse.call, strikesResponse.put);
      const strikes = selectStrikesForChain(allStrikes, request.strikeWindow);
      if (
        request.strikeWindow?.mode === "atm" &&
        strikes.length < allStrikes.length
      ) {
        warnings.push(
          `Loaded ${strikes.length} of ${allStrikes.length} strikes (ATM window)`,
        );
      }

      const matched: Array<{ info: IbkrOptionInfoRow; expiration: string }> = [];

      for (const strike of strikes) {
        for (const right of ["C", "P"] as const) {
          try {
            const rows = await contractResolver.getCachedOptionContractInfo(
              resolved.optionsConid,
              ibkrMonth,
              strike,
              right,
            );
            for (const row of rows) {
              const maturity = asNonEmptyString(row.maturityDate);
              if (!maturity) continue;
              const rowExpiration = ibkrMaturityToExpiration(maturity);
              if (rowExpiration !== expiration && maturity !== maturityKey) continue;
              matched.push({ info: row, expiration: rowExpiration ?? expiration });
            }
          } catch (error) {
            warnings.push(
              error instanceof Error
                ? `IBKR contract info strike ${strike} ${right}: ${error.message}`
                : `IBKR contract info strike ${strike} ${right} failed`,
            );
          }
        }
      }

      if (matched.length === 0) {
        warnings.push(`IBKR returned no contracts for ${underlying} ${expiration}`);
        return { chain: { underlying, expiration, contracts: [] }, warnings };
      }

      const conids = matched
        .map((m) => {
          const raw = m.info.conid;
          if (typeof raw === "number") return raw;
          if (typeof raw === "string" && raw.trim() !== "") return Number(raw);
          return NaN;
        })
        .filter((id) => Number.isFinite(id) && id > 0);

      const snapshotByConid = new Map<number, IbkrSnapshotRow>();
      for (let i = 0; i < conids.length; i += SNAPSHOT_BATCH_SIZE) {
        const batch = conids.slice(i, i + SNAPSHOT_BATCH_SIZE);
        try {
          const rows = await ibkr.getOptionMarketSnapshots(batch);
          for (const row of rows) {
            const id = asFiniteNumber(row.conid);
            if (id != null) snapshotByConid.set(id, row);
          }
        } catch (error) {
          warnings.push(
            error instanceof Error
              ? `IBKR option snapshot batch failed: ${error.message}`
              : "IBKR option snapshot batch failed",
          );
        }
      }

      const contracts: OptionContractSnapshot[] = [];
      for (const { info, expiration: rowExpiration } of matched) {
        const conidRaw = info.conid;
        const conid =
          typeof conidRaw === "number"
            ? conidRaw
            : typeof conidRaw === "string"
              ? Number(conidRaw)
              : NaN;
        const snapshot = Number.isFinite(conid) ? snapshotByConid.get(conid) : undefined;
        const mapped = mapIbkrOptionContract(info, underlying, rowExpiration, snapshot);
        if (!mapped) {
          warnings.push(
            `Dropped malformed IBKR option row conid=${String(info.conid ?? "unknown")}`,
          );
          continue;
        }
        const validated = validateContract(mapped, warnings);
        if (validated) contracts.push(validated);
      }

      contracts.sort((a, b) => a.strike - b.strike || a.type.localeCompare(b.type));

      return {
        chain: { underlying, expiration, contracts },
        warnings,
      };
    },
  };
}

export type IbkrOptionsProvider = ReturnType<typeof createIbkrOptionsProvider>;
