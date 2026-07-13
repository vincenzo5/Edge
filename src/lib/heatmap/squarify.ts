import type { HeatMapConfig, HeatMapItem, HeatMapRect } from "./types";

type LayoutNode = {
  id: string;
  label: string;
  kind: "leaf" | "group";
  weight: number;
  colorValue: number | null;
  children: LayoutNode[];
  item?: HeatMapItem;
};

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const GROUP_LABEL_HEIGHT = 16;
const GROUP_PADDING = 2;
const LEAF_GAP = 1;
const MIN_WEIGHT = 1e-6;

function normalizeWeight(value: number | null, scale: HeatMapConfig["sizeBy"]["scale"]): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return MIN_WEIGHT;
  if (scale === "log") return Math.log10(value + 1);
  return value;
}

export function resolveItemWeight(item: HeatMapItem, config: HeatMapConfig): number | null {
  if (config.sizeBy.metric === "equal") return 1;
  return item.sizeValue;
}

export function buildLayoutNodes(items: HeatMapItem[], config: HeatMapConfig): LayoutNode[] {
  const visible = items.filter((item) => {
    if (config.colorBy.missing === "hide" && item.colorValue == null) return false;
    if (config.sizeBy.missing === "drop") {
      const weight = resolveItemWeight(item, config);
      if (weight == null || !Number.isFinite(weight) || weight <= 0) return false;
    }
    return true;
  });

  const toLeaf = (item: HeatMapItem): LayoutNode => ({
    id: item.id,
    label: item.label,
    kind: "leaf",
    weight: Math.max(
      MIN_WEIGHT,
      normalizeWeight(resolveItemWeight(item, config), config.sizeBy.scale),
    ),
    colorValue: item.colorValue,
    children: [],
    item,
  });

  if (config.groupBy === "none") {
    return visible.map(toLeaf);
  }

  const groups = new Map<string, HeatMapItem[]>();
  for (const item of visible) {
    const key =
      config.groupBy === "sector"
        ? item.groupPath?.[0] ?? "Other"
        : item.groupPath?.[1] ?? item.groupPath?.[0] ?? "Other";
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupLabel, groupItems]) => {
      const children = groupItems.map(toLeaf);
      const weight = children.reduce((sum, child) => sum + child.weight, 0);
      return {
        id: `group:${groupLabel}`,
        label: groupLabel,
        kind: "group" as const,
        weight: Math.max(MIN_WEIGHT, weight),
        colorValue: null,
        children,
      };
    });
}

function worstRatio(row: LayoutNode[], length: number): number {
  if (row.length === 0 || length <= 0) return Number.POSITIVE_INFINITY;
  const sum = row.reduce((total, node) => total + node.weight, 0);
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const node of row) {
    min = Math.min(min, node.weight);
    max = Math.max(max, node.weight);
  }
  const s2 = sum * sum;
  return Math.max((length * length * max) / s2, s2 / (length * length * min));
}

function layoutRow(
  row: LayoutNode[],
  bounds: Bounds,
  horizontal: boolean,
  output: HeatMapRect[],
): Bounds {
  const sum = row.reduce((total, node) => total + node.weight, 0);
  if (sum <= 0) return bounds;

  if (horizontal) {
    const rowHeight = sum / Math.max(bounds.width, MIN_WEIGHT);
    let x = bounds.x;
    for (const node of row) {
      const width = (bounds.width * node.weight) / sum;
      placeNode(node, { x, y: bounds.y, width, height: rowHeight }, output);
      x += width;
    }
    return {
      x: bounds.x,
      y: bounds.y + rowHeight,
      width: bounds.width,
      height: Math.max(0, bounds.height - rowHeight),
    };
  }

  const rowWidth = sum / Math.max(bounds.height, MIN_WEIGHT);
  let y = bounds.y;
  for (const node of row) {
    const height = (bounds.height * node.weight) / sum;
    placeNode(node, { x: bounds.x, y, width: rowWidth, height }, output);
    y += height;
  }
  return {
    x: bounds.x + rowWidth,
    y: bounds.y,
    width: Math.max(0, bounds.width - rowWidth),
    height: bounds.height,
  };
}

function normalizeNodeWeights(nodes: LayoutNode[], area: number): LayoutNode[] {
  const sum = nodes.reduce((total, node) => total + node.weight, 0);
  if (sum <= 0) return nodes;
  const scale = area / sum;
  return nodes.map((node) => ({
    ...node,
    weight: node.weight * scale,
    children:
      node.children.length > 0
        ? normalizeNodeWeights(node.children, node.weight * scale)
        : node.children,
  }));
}

function squarifyNodes(nodes: LayoutNode[], bounds: Bounds, output: HeatMapRect[]): void {
  const area = bounds.width * bounds.height;
  if (area <= 0) return;
  const normalized = normalizeNodeWeights(nodes, area);
  const sorted = [...normalized].sort((a, b) => b.weight - a.weight);
  let remaining = bounds;
  let index = 0;
  while (index < sorted.length) {
    const horizontal = remaining.width >= remaining.height;
    const row: LayoutNode[] = [sorted[index]!];
    index += 1;
    while (index < sorted.length) {
      const candidate = sorted[index]!;
      const length = horizontal ? remaining.width : remaining.height;
      const currentWorst = worstRatio(row, length);
      const nextWorst = worstRatio([...row, candidate], length);
      if (nextWorst <= currentWorst) {
        row.push(candidate);
        index += 1;
      } else {
        break;
      }
    }
    remaining = layoutRow(row, remaining, horizontal, output);
  }
}

function insetBounds(bounds: Bounds, gap: number): Bounds {
  return {
    x: bounds.x + gap,
    y: bounds.y + gap,
    width: Math.max(0, bounds.width - gap * 2),
    height: Math.max(0, bounds.height - gap * 2),
  };
}

function placeNode(node: LayoutNode, bounds: Bounds, output: HeatMapRect[]): void {
  if (bounds.width <= 0 || bounds.height <= 0) return;

  if (node.kind === "group") {
    output.push({
      id: node.id,
      label: node.label,
      kind: "group",
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      colorValue: null,
    });
    const inner = insetBounds(
      {
        x: bounds.x,
        y: bounds.y + GROUP_LABEL_HEIGHT,
        width: bounds.width,
        height: Math.max(0, bounds.height - GROUP_LABEL_HEIGHT),
      },
      GROUP_PADDING,
    );
    squarifyNodes(node.children, inner, output);
    return;
  }

  output.push({
    id: node.id,
    label: node.label,
    kind: "leaf",
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    colorValue: node.colorValue,
    item: node.item,
  });
}

export function layoutHeatMap(
  items: HeatMapItem[],
  config: HeatMapConfig,
  width: number,
  height: number,
): HeatMapRect[] {
  if (width <= 0 || height <= 0) return [];
  const nodes = buildLayoutNodes(items, config);
  if (nodes.length === 0) return [];
  const output: HeatMapRect[] = [];
  squarifyNodes(nodes, insetBounds({ x: 0, y: 0, width, height }, LEAF_GAP), output);
  return output;
}

export function leafRects(rects: HeatMapRect[]): HeatMapRect[] {
  return rects.filter((rect) => rect.kind === "leaf");
}

export function totalLeafArea(rects: HeatMapRect[]): number {
  return leafRects(rects).reduce((sum, rect) => sum + rect.width * rect.height, 0);
}
