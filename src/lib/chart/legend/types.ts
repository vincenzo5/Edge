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

export type SeriesOutput = {
  id: string;
  label: string;
  key: string;
  tooltip?: string;
  decimals?: number;
  color?: SeriesColor;
};
