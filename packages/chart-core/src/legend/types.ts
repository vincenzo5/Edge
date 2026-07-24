export type LegendActionIcon = 'visibility' | 'settings' | 'source' | 'delete' | 'more';

export type LegendSection =
  | { kind: 'badge'; letter: string; tooltip?: string }
  | { kind: 'text'; text: string; muted?: boolean; tooltip?: string }
  | {
      kind: 'value';
      id: string;
      label: string;
      value: string;
      color?: string;
      tooltip?: string;
    }
  | {
      kind: 'action';
      id: string;
      icon: LegendActionIcon;
      tooltip: string;
      disabled?: boolean;
    };

export type LegendValueEntry = {
  id: string;
  label: string;
  value: number | null;
  color?: string;
  tooltip?: string;
  decimals?: number;
};

export type SeriesColor = string | ((theme: import('../contracts').Theme, value: number | null) => string);

export type PlotKind =
  | 'line'
  | 'histogram'
  | 'hline'
  | 'columns'
  | 'marker'
  | 'bgcolor'
  | 'barcolor';

export type SeriesStyle = 'line' | 'stepline' | 'circles' | 'crosses' | 'area' | 'columns';

export type MarkerShape =
  | 'circle'
  | 'cross'
  | 'triangleUp'
  | 'triangleDown'
  | 'arrowUp'
  | 'arrowDown'
  | 'square';

export type MarkerLocation = 'absolute' | 'aboveBar' | 'belowBar';

export type SeriesLegendMode = 'value' | 'signal';

export type SeriesOutput = {
  id: string;
  label: string;
  key: string;
  plot?: PlotKind;
  hlineAt?: number;
  lineWidth?: number;
  fillBetween?: string;
  /** Fill color when fillBetween is set. */
  fillColor?: SeriesColor;
  tooltip?: string;
  decimals?: number;
  color?: SeriesColor;
  /** Script-only: bounded serializable conditional color rules. */
  colorRules?: import('../scriptContracts').ScriptColorRule[];
  style?: SeriesStyle;
  markerShape?: MarkerShape;
  markerLocation?: MarkerLocation;
  markerSize?: number;
  opacity?: number;
  excludeFromScale?: boolean;
  legendMode?: SeriesLegendMode;
};
