import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import {
  formatOptionGreek,
  formatOptionIv,
  formatOptionPrice,
} from "@/lib/options/optionsClient";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatExpirationTabLabel(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || !Number.isFinite(day)) return iso;
  return `${MONTHS[month]} ${day}`;
}

function parseExpirationDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || !Number.isFinite(day)) return null;
  return new Date(year, month, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysToExpiration(iso: string, now: Date = new Date()): number {
  const expiration = parseExpirationDate(iso);
  if (!expiration) return 0;
  const diffMs = startOfDay(expiration).getTime() - startOfDay(now).getTime();
  return Math.max(0, Math.round(diffMs / (24 * 60 * 60 * 1000)));
}

export function formatExpirationDteLabel(iso: string, now: Date = new Date()): string {
  return `${daysToExpiration(iso, now)}d`;
}

export function formatExpirationAriaLabel(iso: string, now: Date = new Date()): string {
  const label = formatExpirationTabLabel(iso);
  const days = daysToExpiration(iso, now);
  const dayWord = days === 1 ? "day" : "days";
  return `Expiration ${label}, ${days} ${dayWord}`;
}

export function isAtmStrike(strike: number, spot: number | null): boolean {
  if (spot == null || !Number.isFinite(spot) || spot <= 0) return false;
  return Math.abs(strike - spot) / spot < 0.005;
}

export function formatOptionLast(value: number | null | undefined): string {
  return formatOptionPrice(value);
}

export function isLastOutsideSpread(contract: OptionContractSnapshot | undefined): boolean {
  if (!contract) return false;
  const { last, bid, ask } = contract;
  if (last == null || !Number.isFinite(last)) return false;
  if (bid != null && Number.isFinite(bid) && last < bid) return true;
  if (ask != null && Number.isFinite(ask) && last > ask) return true;
  return false;
}

function formatContractVolume(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatContractOpenInterest(value: number | null | undefined): string {
  return formatContractVolume(value);
}

export type ChainRowGreeksLeg = {
  label: string;
  missing: boolean;
  greeksUnavailable: boolean;
  volume: string;
  openInterest: string;
  iv: string;
  delta: string;
  gamma: string;
  theta: string;
  vega: string;
};

export type ChainRowGreeksPanel = {
  header: string;
  call: ChainRowGreeksLeg;
  put: ChainRowGreeksLeg;
};

export type ChainLegGreeksPanel = {
  header: string;
  leg: ChainRowGreeksLeg;
  bid: string;
  ask: string;
  last: string;
  side: "call" | "put";
};

function contractHasGreeks(contract: OptionContractSnapshot): boolean {
  return (
    contract.impliedVolatility != null ||
    contract.delta != null ||
    contract.gamma != null ||
    contract.theta != null ||
    contract.vega != null
  );
}

function formatChainRowGreeksLeg(
  label: string,
  contract: OptionContractSnapshot | undefined,
): ChainRowGreeksLeg {
  if (!contract) {
    return {
      label,
      missing: true,
      greeksUnavailable: false,
      volume: "—",
      openInterest: "—",
      iv: "—",
      delta: "—",
      gamma: "—",
      theta: "—",
      vega: "—",
    };
  }

  if (!contractHasGreeks(contract)) {
    return {
      label,
      missing: false,
      greeksUnavailable: true,
      volume: "—",
      openInterest: "—",
      iv: "Greeks unavailable",
      delta: "—",
      gamma: "—",
      theta: "—",
      vega: "—",
    };
  }

  return {
    label,
    missing: false,
    greeksUnavailable: false,
    volume: formatContractVolume(contract.volume),
    openInterest: formatContractOpenInterest(contract.openInterest),
    iv: formatOptionIv(contract.impliedVolatility),
    delta: formatOptionGreek(contract.delta),
    gamma: formatOptionGreek(contract.gamma),
    theta: formatOptionGreek(contract.theta),
    vega: formatOptionGreek(contract.vega),
  };
}

export function formatChainRowGreeksPanel(
  strike: number,
  expiration: string,
  call: OptionContractSnapshot | undefined,
  put: OptionContractSnapshot | undefined,
): ChainRowGreeksPanel {
  return {
    header: `${strike} strike · ${formatExpirationTabLabel(expiration)}`,
    call: formatChainRowGreeksLeg(`CALL ${strike}C`, call),
    put: formatChainRowGreeksLeg(`PUT ${strike}P`, put),
  };
}

export function formatChainLegGreeksPanel(
  side: "call" | "put",
  strike: number,
  expiration: string,
  contract: OptionContractSnapshot | undefined,
): ChainLegGreeksPanel {
  const suffix = side === "call" ? "C" : "P";
  const label = side === "call" ? "CALL" : "PUT";
  return {
    header: `${label} ${strike}${suffix} · ${formatExpirationTabLabel(expiration)}`,
    leg: formatChainRowGreeksLeg(`${label} ${strike}${suffix}`, contract),
    bid: formatOptionPrice(contract?.bid),
    ask: formatOptionPrice(contract?.ask),
    last: formatOptionLast(contract?.last),
    side,
  };
}

export function chainRowSideClass(
  strike: number,
  spot: number | null,
  side: "call" | "put",
): string {
  if (spot == null || !Number.isFinite(spot)) return "";
  if (isAtmStrike(strike, spot)) return "";
  if (side === "call") {
    return strike < spot
      ? "bg-[var(--edge-positive)]/5"
      : "bg-[var(--edge-negative)]/5";
  }
  return strike > spot
    ? "bg-[var(--edge-positive)]/5"
    : "bg-[var(--edge-negative)]/5";
}

/** Popover header wash aligned with chain row side / ATM band coloring. */
export function chainLegHeaderClass(
  strike: number,
  spot: number | null,
  side: "call" | "put",
): string {
  if (isAtmStrike(strike, spot)) {
    return "bg-[var(--edge-accent-blue)]/10 text-[var(--edge-text-strong)]";
  }
  const sideBg = chainRowSideClass(strike, spot, side);
  if (sideBg) {
    return `${sideBg} text-[var(--edge-text-primary)]`;
  }
  return "bg-[var(--edge-bg-secondary)] text-[var(--edge-text-primary)]";
}

export function chainRowClass(strike: number, spot: number | null): string {
  if (!isAtmStrike(strike, spot)) return "";
  return "bg-[var(--edge-accent-blue)]/10 ring-1 ring-inset ring-[var(--edge-accent-blue)]/30";
}
