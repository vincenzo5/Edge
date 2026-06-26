/** Minimal context contract for tool execution. Host apps extend this with domain ports. */
export type BaseToolContext = {
  /** When false, client-session tools should no-op or return an error. */
  clientSession: boolean;
};
