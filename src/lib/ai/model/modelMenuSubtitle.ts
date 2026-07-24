import type { ModelRef } from "./types";

/** Menu subtitle for in-bar model picker. */
export function modelMenuSubtitle(
  model: Pick<ModelRef, "id" | "label" | "provider">,
): string {
  const idTail = model.id.includes("/") ? model.id.split("/").slice(1).join("/") : model.id;
  return `${model.provider} · ${idTail}`;
}
