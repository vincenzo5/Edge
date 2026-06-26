import type { SVGProps } from "react";
import {
  CHART_ICON_MARKUP,
  ICON_STROKE,
  ICON_VIEWBOX,
  type ChartIconId,
} from "./iconPaths";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function ChartIcon({
  id,
  size = 18,
  ...props
}: Omit<IconProps, 'id'> & { id: ChartIconId }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={ICON_VIEWBOX}
      {...ICON_STROKE}
      {...props}
      dangerouslySetInnerHTML={{ __html: CHART_ICON_MARKUP[id] }}
    />
  );
}

export const CrosshairIcon = (p: IconProps) => <ChartIcon {...p} id="crosshair" />;
export const HorizontalLineIcon = (p: IconProps) => (
  <ChartIcon {...p} id="horizontal-line" />
);
export const VerticalLineIcon = (p: IconProps) => (
  <ChartIcon {...p} id="vertical-line" />
);
export const TrendLineIcon = (p: IconProps) => <ChartIcon {...p} id="trend-line" />;
export const RayLineIcon = (p: IconProps) => <ChartIcon {...p} id="ray-line" />;
export const ParallelChannelIcon = (p: IconProps) => (
  <ChartIcon {...p} id="parallel-channel" />
);
export const PriceChannelIcon = (p: IconProps) => (
  <ChartIcon {...p} id="price-channel" />
);
export const RectangleIcon = (p: IconProps) => <ChartIcon {...p} id="rectangle" />;
export const CircleIcon = (p: IconProps) => <ChartIcon {...p} id="circle" />;
export const FibRetracementIcon = (p: IconProps) => (
  <ChartIcon {...p} id="fib-retracement" />
);
export const PriceLineIcon = (p: IconProps) => <ChartIcon {...p} id="price-line" />;
export const TextAnnotationIcon = (p: IconProps) => (
  <ChartIcon {...p} id="text-annotation" />
);
export const MeasureIcon = (p: IconProps) => <ChartIcon {...p} id="measure" />;
export const RiskRulerIcon = (p: IconProps) => <ChartIcon {...p} id="risk-ruler" />;
export const ZoomInIcon = (p: IconProps) => <ChartIcon {...p} id="zoom-in" />;
export const MagnetIcon = (p: IconProps) => <ChartIcon {...p} id="magnet" />;
export const KeepDrawingIcon = (p: IconProps) => (
  <ChartIcon {...p} id="keep-drawing" />
);
export const LockAllIcon = (p: IconProps) => <ChartIcon {...p} id="lock-all" />;
export const LockIcon = (p: IconProps) => <ChartIcon {...p} id="lock" />;
export const EyeIcon = (p: IconProps) => <ChartIcon {...p} id="eye" />;
export const EyeOffIcon = (p: IconProps) => <ChartIcon {...p} id="eye-off" />;
export const HideDrawingsIcon = (p: IconProps) => (
  <ChartIcon {...p} id="hide-drawings" />
);
export const TrashIcon = (p: IconProps) => <ChartIcon {...p} id="trash" />;
export const DeleteIcon = (p: IconProps) => <ChartIcon {...p} id="delete" />;
export const PaneMoveUpIcon = (p: IconProps) => <ChartIcon {...p} id="pane-move-up" />;
export const PaneMoveDownIcon = (p: IconProps) => <ChartIcon {...p} id="pane-move-down" />;
export const PaneCollapseIcon = (p: IconProps) => <ChartIcon {...p} id="pane-collapse" />;
export const PaneRestoreIcon = (p: IconProps) => <ChartIcon {...p} id="pane-restore" />;
export const PaneMaximizeIcon = (p: IconProps) => <ChartIcon {...p} id="pane-maximize" />;
export const PaneRestoreLayoutIcon = (p: IconProps) => (
  <ChartIcon {...p} id="pane-restore-layout" />
);

export const CHART_TOOL_ICONS = {
  __cursor__: CrosshairIcon,
  horizontalStraightLine: HorizontalLineIcon,
  verticalStraightLine: VerticalLineIcon,
  straightLine: TrendLineIcon,
  rayLine: RayLineIcon,
  parallelStraightLine: ParallelChannelIcon,
  priceChannelLine: PriceChannelIcon,
  rect: RectangleIcon,
  circle: CircleIcon,
  fibonacciLine: FibRetracementIcon,
  priceLine: PriceLineIcon,
  simpleAnnotation: TextAnnotationIcon,
  measure: MeasureIcon,
  riskRuler: RiskRulerIcon,
} as const;
