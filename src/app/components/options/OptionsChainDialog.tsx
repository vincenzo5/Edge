"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OptionsChainView } from "./OptionsChainView";
import {
  OptionsRiskCalculator,
  type RiskCalculatorSeedLeg,
} from "./OptionsRiskCalculator";
import { useOptionsChainModel } from "./useOptionsChainModel";
import { useRiskSettings } from "../RiskSettingsProvider";
import EdgeSegmentedTabs from "../design-system/EdgeSegmentedTabs";

type Props = {
  open: boolean;
  onClose: () => void;
};

const DEFAULT_WIDTH = 920;
const DEFAULT_HEIGHT = 560;
const MIN_WIDTH = 480;
const MIN_HEIGHT = 320;

type DialogContentProps = {
  onClose: () => void;
};

type DialogMode = "chain" | "calculator";

function OptionsChainDialogContent({ onClose }: DialogContentProps) {
  const model = useOptionsChainModel();
  const { dollarRisk, basisStale } = useRiskSettings();
  const dialogRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [position, setPosition] = useState({ x: 48, y: 48 });
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [mode, setMode] = useState<DialogMode>("chain");
  const [seedLeg, setSeedLeg] = useState<RiskCalculatorSeedLeg | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const clampPosition = useCallback(
    (next: { x: number; y: number }) => {
      const container = dialogRef.current?.offsetParent as HTMLElement | null;
      const containerWidth = container?.clientWidth ?? window.innerWidth;
      const containerHeight = container?.clientHeight ?? window.innerHeight;
      return {
        x: Math.max(8, Math.min(containerWidth - size.width - 8, next.x)),
        y: Math.max(8, Math.min(containerHeight - size.height - 8, next.y)),
      };
    },
    [size.width, size.height],
  );

  const handleHeaderPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      e.preventDefault();
      e.stopPropagation();
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        ox: position.x,
        oy: position.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [position.x, position.y],
  );

  const handleHeaderPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPosition(
        clampPosition({
          x: dragStartRef.current.ox + dx,
          y: dragStartRef.current.oy + dy,
        }),
      );
    },
    [clampPosition],
  );

  const handleHeaderPointerUp = useCallback((e: React.PointerEvent) => {
    dragStartRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const symbol = model.symbol ?? "Options";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-label={`${symbol} options chain`}
      data-testid="options-chain-dialog"
      className="pointer-events-auto absolute z-40 flex flex-col overflow-hidden rounded-lg border border-[var(--edge-border-strong)] bg-[var(--edge-surface-popover)] shadow-2xl"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        maxWidth: "calc(100% - 16px)",
        maxHeight: "calc(100% - 16px)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        data-testid="options-chain-dialog-header"
        className="flex cursor-grab items-center justify-between border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-3 py-2 active:cursor-grabbing"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
      >
        <div className="flex items-center gap-2">
          <span className="text-[var(--edge-text-muted)]" aria-hidden>
            ⠿
          </span>
          <span className="text-xs font-semibold text-[var(--edge-text-strong)]">
            {symbol} — Options Chain
          </span>
          <div data-no-drag className="ml-2">
            <EdgeSegmentedTabs
              segments={[
                { id: "chain", label: "Chain" },
                { id: "calculator", label: "Risk Calculator" },
              ]}
              value={mode}
              onChange={(value) => setMode(value as DialogMode)}
            />
          </div>
        </div>
        <button
          type="button"
          data-no-drag
          data-testid="options-chain-dialog-close"
          onClick={onClose}
          className="edge-icon-button edge-focus-ring rounded px-2 py-1 text-lg leading-none text-[var(--edge-text-secondary)] hover:text-[var(--edge-text-primary)]"
          aria-label="Close options chain"
        >
          ×
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {mode === "chain" ? (
          <OptionsChainView
            model={model}
            variant="dialog"
            onAnalyzeContract={(contract) => {
              setSeedLeg({ contract, action: "buy", quantity: 1 });
              setMode("calculator");
            }}
          />
        ) : (
          <OptionsRiskCalculator
            model={model}
            dollarRisk={dollarRisk}
            basisStale={basisStale}
            seedLeg={seedLeg}
            onSeedConsumed={() => setSeedLeg(null)}
            onDone={() => setMode("chain")}
          />
        )}
      </div>
      <div
        data-testid="options-chain-dialog-resize"
        className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
        aria-hidden
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const startX = e.clientX;
          const startY = e.clientY;
          const startW = size.width;
          const startH = size.height;

          const onMove = (moveEvent: PointerEvent) => {
            setSize({
              width: Math.max(MIN_WIDTH, startW + (moveEvent.clientX - startX)),
              height: Math.max(MIN_HEIGHT, startH + (moveEvent.clientY - startY)),
            });
          };

          const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
          };

          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
        }}
      />
    </div>
  );
}

export function OptionsChainDialog({ open, onClose }: Props) {
  if (!open) return null;
  return <OptionsChainDialogContent onClose={onClose} />;
}
