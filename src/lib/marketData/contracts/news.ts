export type NewsItem = {
  id: string;
  headline: string;
  source: string;
  url?: string;
  symbols: string[];
  publishedAt: string;
  summary?: string;
  sentiment?: number;
};
