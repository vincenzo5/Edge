export const EDGE_LOCAL_ERROR_EVENT = "edge:local-error";

export type EdgeLocalErrorDetail = {
  source: string;
  message: string;
  stack?: string;
  detail?: string;
};

export function dispatchEdgeLocalError(detail: EdgeLocalErrorDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<EdgeLocalErrorDetail>(EDGE_LOCAL_ERROR_EVENT, { detail }));
}
