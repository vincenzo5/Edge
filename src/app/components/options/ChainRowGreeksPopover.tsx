"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import {
  chainLegHeaderClass,
  formatChainLegGreeksPanel,
  type ChainRowGreeksLeg,
} from "@/lib/options/chainDisplay";

const SHOW_DELAY_MS = 150;
const VIEWPORT_PADDING_PX = 8;
const POPOVER_WIDTH_PX = 240;

type ChainLegGreeksPopoverProps = {
  side: "call" | "put";
  strike: number;
  expiration: string;
  spotPrice: number | null;
  contract: OptionContractSnapshot | undefined;
  onAnalyzeContract?: (contract: OptionContractSnapshot) => void;
  children: ReactNode;
};

function popoverStyle(rect: DOMRect, side: "call" | "put"): CSSProperties {
  const viewportWidth =
    typeof window === "undefined" ? Number.POSITIVE_INFINITY : window.innerWidth;
  const viewportHeight =
    typeof window === "undefined" ? Number.POSITIVE_INFINITY : window.innerHeight;

  const left =
    side === "call"
      ? Math.min(
          Math.max(rect.left, VIEWPORT_PADDING_PX),
          viewportWidth - VIEWPORT_PADDING_PX - POPOVER_WIDTH_PX,
        )
      : Math.min(
          Math.max(rect.right - POPOVER_WIDTH_PX, VIEWPORT_PADDING_PX),
          viewportWidth - VIEWPORT_PADDING_PX - POPOVER_WIDTH_PX,
        );

  const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_PADDING_PX;
  const spaceAbove = rect.top - VIEWPORT_PADDING_PX;
  const showBelow = spaceBelow >= spaceAbove;

  return {
    position: "fixed",
    top: showBelow ? rect.bottom + 4 : rect.top - 4,
    left,
    transform: showBelow ? undefined : "translateY(-100%)",
    zIndex: 10_000,
    width: POPOVER_WIDTH_PX,
  };
}

function LegLiquidity({ leg }: { leg: ChainRowGreeksLeg }) {
  if (leg.missing || leg.greeksUnavailable) {
    return <span className="text-[var(--edge-text-secondary)]">—</span>;
  }

  return (
    <span className="inline-flex gap-2 tabular-nums">
      <span>
        <span className="text-[var(--edge-text-secondary)]">Vol </span>
        <span className="font-semibold text-[var(--edge-text-primary)]">{leg.volume}</span>
      </span>
      <span>
        <span className="text-[var(--edge-text-secondary)]">OI </span>
        <span className="font-semibold text-[var(--edge-text-primary)]">{leg.openInterest}</span>
      </span>
    </span>
  );
}

function LegValue({ leg, field }: { leg: ChainRowGreeksLeg; field: keyof ChainRowGreeksLeg }) {
  const value = leg[field];
  if (typeof value !== "string") return null;

  if (leg.greeksUnavailable && field === "iv") {
    return (
      <span className="text-[var(--edge-text-secondary)] italic">{value}</span>
    );
  }

  if (leg.missing || value === "—") {
    return <span className="text-[var(--edge-text-secondary)]">—</span>;
  }

  return <span className="font-semibold tabular-nums text-[var(--edge-text-primary)]">{value}</span>;
}

const GREEK_ROWS = [
  { label: "Δ Delta", field: "delta" as const },
  { label: "Γ Gamma", field: "gamma" as const },
  { label: "Θ Theta", field: "theta" as const },
  { label: "V Vega", field: "vega" as const },
];

export function ChainLegGreeksPopover({
  side,
  strike,
  expiration,
  spotPrice,
  contract,
  onAnalyzeContract,
  children,
}: ChainLegGreeksPopoverProps) {
  const popoverId = useId();
  const cellsRef = useRef<(HTMLTableCellElement | null)[]>([]);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<CSSProperties | null>(null);

  const panel = formatChainLegGreeksPanel(side, strike, expiration, contract);
  const testId = `options-chain-${side}-greeks-${strike}`;
  const headerClass = chainLegHeaderClass(strike, spotPrice, side);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const getGroupRect = useCallback((): DOMRect | null => {
    const cells = cellsRef.current.filter(Boolean) as HTMLTableCellElement[];
    if (cells.length === 0) return null;
    const rects = cells.map((cell) => cell.getBoundingClientRect());
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    return new DOMRect(left, top, right - left, bottom - top);
  }, []);

  const updatePosition = useCallback(() => {
    const rect = getGroupRect();
    if (!rect) return;
    setPopoverPosition(popoverStyle(rect, side));
  }, [getGroupRect, side]);

  const show = useCallback(() => {
    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      updatePosition();
      setVisible(true);
    }, SHOW_DELAY_MS);
  }, [clearShowTimer, updatePosition]);

  const hide = useCallback(() => {
    clearShowTimer();
    setVisible(false);
    setPopoverPosition(null);
  }, [clearShowTimer]);

  useEffect(() => () => clearShowTimer(), [clearShowTimer]);

  useLayoutEffect(() => {
    if (!visible) return;
    updatePosition();
    const onLayoutChange = () => updatePosition();
    window.addEventListener("scroll", onLayoutChange, true);
    window.addEventListener("resize", onLayoutChange);
    return () => {
      window.removeEventListener("scroll", onLayoutChange, true);
      window.removeEventListener("resize", onLayoutChange);
    };
  }, [visible, updatePosition]);

  const quoteLabels =
    side === "call"
      ? (["Bid", "Ask", "Last"] as const)
      : (["Last", "Ask", "Bid"] as const);
  const quoteValues =
    side === "call"
      ? ([panel.bid, panel.ask, panel.last] as const)
      : ([panel.last, panel.ask, panel.bid] as const);

  const popover =
    visible && typeof document !== "undefined" ? (
      createPortal(
        <div
          id={popoverId}
          role="tooltip"
          data-testid={testId}
          className="edge-popover pointer-events-auto overflow-hidden rounded border text-[11px] leading-snug shadow-md"
          style={popoverPosition ?? { visibility: "hidden" }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div
            data-testid={`${testId}-header`}
            className={`border-b border-[var(--edge-border)] px-2.5 py-1.5 font-medium ${headerClass}`}
          >
            {panel.header}
          </div>

          <div className="px-2.5 py-2">
          <div className="mb-2 border-b border-[var(--edge-border)] pb-1.5">
            <div className="grid grid-cols-3 gap-x-2 text-center">
              {quoteLabels.map((label) => (
                <div key={label} className="text-[var(--edge-text-secondary)]">
                  {label}
                </div>
              ))}
            </div>
            <div className="mt-0.5 grid grid-cols-3 gap-x-2 text-center tabular-nums">
              {quoteValues.map((value, index) => (
                <div
                  key={quoteLabels[index]}
                  className={
                    value === "—"
                      ? "text-[var(--edge-text-secondary)]"
                      : "font-semibold text-[var(--edge-text-primary)]"
                  }
                >
                  {value}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1 border-b border-[var(--edge-border)] pb-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--edge-text-secondary)]">Liquidity</span>
              <LegLiquidity leg={panel.leg} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--edge-text-secondary)]">IV</span>
              <LegValue leg={panel.leg} field="iv" />
            </div>
          </div>

          <div className="mt-1.5 space-y-1">
            {GREEK_ROWS.map(({ label, field }) => (
              <div key={field} className="flex items-center justify-between gap-2">
                <span className="text-[var(--edge-text-secondary)]">{label}</span>
                <LegValue leg={panel.leg} field={field} />
              </div>
            ))}
          </div>

          {onAnalyzeContract && contract ? (
            <div className="mt-2 border-t border-[var(--edge-border)] pt-2">
              <button
                type="button"
                data-testid={`options-analyze-${side}-${strike}`}
                onClick={() => onAnalyzeContract(contract)}
                className="w-full rounded bg-[var(--edge-bg-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--edge-accent-blue)] hover:bg-[var(--edge-accent-blue)]/10"
              >
                Analyze {side}
              </button>
            </div>
          ) : null}
          </div>
        </div>,
        document.body,
      )
    ) : null;

  const enhancedChildren = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child;

    const element = child as ReactElement<{
      onMouseEnter?: React.MouseEventHandler<HTMLTableCellElement>;
      onMouseLeave?: React.MouseEventHandler<HTMLTableCellElement>;
      onFocus?: React.FocusEventHandler<HTMLTableCellElement>;
      onBlur?: React.FocusEventHandler<HTMLTableCellElement>;
    }>;

    return cloneElement(element, {
      ref: (el: HTMLTableCellElement | null) => {
        cellsRef.current[index] = el;
      },
      onMouseEnter: (event) => {
        element.props.onMouseEnter?.(event);
        show();
      },
      onMouseLeave: (event) => {
        element.props.onMouseLeave?.(event);
        hide();
      },
      onFocus: (event) => {
        element.props.onFocus?.(event);
        show();
      },
      onBlur: (event) => {
        element.props.onBlur?.(event);
        hide();
      },
      tabIndex: 0,
      "aria-describedby": visible ? popoverId : undefined,
    } as Partial<typeof element.props> & { ref: (el: HTMLTableCellElement | null) => void });
  });

  return (
    <>
      {enhancedChildren}
      {popover}
    </>
  );
}
