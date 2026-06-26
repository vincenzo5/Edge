export type MacroObservation = {
  date: string;
  value: number | null;
};

export type MacroSeries = {
  seriesId: string;
  title: string;
  units?: string;
  frequency?: string;
  observations: MacroObservation[];
  source: string;
  updatedAt: number;
};

export type EconomicRelease = {
  releaseId: string;
  name: string;
  date: string;
  source: string;
};
