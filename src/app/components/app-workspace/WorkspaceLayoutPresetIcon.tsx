"use client";

import type { ReactNode } from "react";

import type { WorkspaceLayoutPreviewNode } from "@/lib/appWorkspace/layoutPresets";

type Props = {
  preview: WorkspaceLayoutPreviewNode;
  size?: number;
};

const GAP = 1;
const PAD = 1;

function renderPreviewNode(
  node: WorkspaceLayoutPreviewNode,
  x: number,
  y: number,
  w: number,
  h: number,
  key: string,
): ReactNode {
  if (node.kind === "leaf") {
    return (
      <rect
        key={key}
        x={x}
        y={y}
        width={w}
        height={h}
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    );
  }

  const [firstSize, secondSize] = node.sizes;
  const total = firstSize + secondSize;
  const firstRatio = firstSize / total;
  const secondRatio = secondSize / total;

  if (node.direction === "row") {
    const firstW = w * firstRatio - GAP / 2;
    const secondW = w * secondRatio - GAP / 2;
    const secondX = x + firstW + GAP;
    return (
      <>
        {renderPreviewNode(node.children[0], x, y, firstW, h, `${key}-0`)}
        {renderPreviewNode(node.children[1], secondX, y, secondW, h, `${key}-1`)}
      </>
    );
  }

  const firstH = h * firstRatio - GAP / 2;
  const secondH = h * secondRatio - GAP / 2;
  const secondY = y + firstH + GAP;
  return (
    <>
      {renderPreviewNode(node.children[0], x, y, w, firstH, `${key}-0`)}
      {renderPreviewNode(node.children[1], x, secondY, w, secondH, `${key}-1`)}
    </>
  );
}

/** Recursive SVG preview for workspace split-tree presets. */
export default function WorkspaceLayoutPresetIcon({ preview, size = 20 }: Props) {
  const inner = size - PAD * 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-hidden
    >
      {renderPreviewNode(preview, PAD, PAD, inner, inner, "root")}
    </svg>
  );
}
