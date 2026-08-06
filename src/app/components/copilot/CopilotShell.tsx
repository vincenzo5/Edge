"use client";

import type { ReactNode } from "react";

export type CopilotShellVariant = "sidebar" | "page" | "tile";

type Props = {
  variant: CopilotShellVariant;
  isEmpty: boolean;
  topChrome?: ReactNode;
  brand?: ReactNode;
  history?: ReactNode;
  evidence?: ReactNode;
  children: ReactNode;
  composer: ReactNode;
  footer?: ReactNode;
  banners?: ReactNode;
  testId?: string;
};

const overlayTopChromeClassName =
  "absolute right-0 top-0 z-10 flex items-center justify-end gap-2 px-[var(--edge-space-4)] py-[var(--edge-space-3)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100";

export function CopilotShell({
  variant,
  isEmpty,
  topChrome,
  brand,
  history,
  evidence,
  children,
  composer,
  footer,
  banners,
  testId = "copilot-panel",
}: Props) {
  const isWideHost = variant === "page" || variant === "tile";
  const hasSideRails = Boolean(history || evidence);
  const overlayTopChrome = isWideHost || isEmpty;

  const topChromeOverlay = topChrome ? (
    <div data-testid="copilot-top-chrome" className={overlayTopChromeClassName}>
      {topChrome}
    </div>
  ) : null;

  if (isEmpty) {
    const emptyHero = (
      <div className="group relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {topChromeOverlay}
        <div
          data-testid="copilot-empty"
          className="flex min-h-0 flex-1 flex-col items-center justify-center px-[var(--edge-space-4)]"
        >
          <div
            data-testid="copilot-empty-cluster"
            className={`flex w-full flex-col items-center ${
              isWideHost ? "max-w-[var(--copilot-bar-max-width)]" : ""
            }`}
          >
            {brand}
            <div className="w-full">{composer}</div>
            {footer ? <div className="w-full">{footer}</div> : null}
          </div>
        </div>
      </div>
    );

    if (hasSideRails) {
      return (
        <div
          data-testid={testId}
          data-copilot-shell-variant={variant}
          className="copilot-shell flex h-full min-h-0 flex-col"
        >
          {banners}
          <div
            data-testid="copilot-empty-layout"
            className="flex min-h-0 flex-1 overflow-hidden"
          >
            {history}
            {emptyHero}
            {evidence}
          </div>
        </div>
      );
    }

    return (
      <div
        data-testid={testId}
        data-copilot-shell-variant={variant}
        className="copilot-shell relative flex h-full min-h-0 flex-col"
      >
        {banners}
        {emptyHero}
      </div>
    );
  }

  const composerDock = (
    <div
      data-testid="copilot-composer-dock"
      className={`shrink-0 px-[var(--edge-space-4)] pb-[calc(var(--edge-space-3)*3)] pt-0 ${
        isWideHost ? "flex justify-center" : ""
      }`}
    >
      <div className={isWideHost ? "w-full max-w-[var(--copilot-bar-max-width)]" : "w-full"}>
        {composer}
      </div>
    </div>
  );

  const mainColumn = (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
        overlayTopChrome ? "group relative" : ""
      }`}
    >
      {overlayTopChrome ? topChromeOverlay : null}
      {children}
      {composerDock}
    </div>
  );

  return (
    <div
      data-testid={testId}
      data-copilot-shell-variant={variant}
      className="copilot-shell flex h-full min-h-0 flex-col"
    >
      {!overlayTopChrome && topChrome ? topChrome : null}
      {banners}
      {hasSideRails ? (
        <div
          data-testid="copilot-active-layout"
          className="flex min-h-0 flex-1 overflow-hidden"
        >
          {history}
          {mainColumn}
          {evidence}
        </div>
      ) : (
        mainColumn
      )}
    </div>
  );
}
