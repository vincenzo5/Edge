export type PriceAxisAnnotationSource =
  | 'symbol'
  | 'indicator'
  | 'drawing'
  | 'crosshair'
  | 'countdown'
  | 'bidAsk'
  | 'highLow'
  | 'prePost';

export type PriceAxisLineStyle = 'hidden' | 'solid' | 'dashed';

export type PriceAxisAnnotation = {
  id: string;
  paneId: string;
  source: PriceAxisAnnotationSource;
  value: number;
  label: string;
  color: string;
  line?: PriceAxisLineStyle;
  showLabel?: boolean;
  priority: number;
};

export type LaidOutPriceAxisAnnotation = PriceAxisAnnotation & {
  y: number;
  displayY: number;
};
