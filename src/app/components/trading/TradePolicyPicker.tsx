"use client";

import { fieldClass } from "../design-system/styles";
import type { PlaybookTemplate } from "@/lib/trading/playbook/types";

export type TradePolicyPickerProps = {
  templates: PlaybookTemplate[];
  value: string | null;
  onChange: (templateId: string | null) => void;
  disabled?: boolean;
  loading?: boolean;
  testId?: string;
};

export function TradePolicyPicker({
  templates,
  value,
  onChange,
  disabled = false,
  loading = false,
  testId = "trade-policy-picker",
}: TradePolicyPickerProps) {
  const selected = templates.find((item) => item.id === value) ?? null;

  return (
    <select
      className={`${fieldClass({ density: "compact" })} max-w-[11rem] truncate text-[10px]`}
      value={value ?? "off"}
      disabled={disabled || loading}
      title={selected?.description ?? "Risk policy"}
      aria-label="Risk policy"
      data-testid={testId}
      onChange={(event) => {
        const next = event.target.value;
        onChange(next === "off" ? null : next);
      }}
    >
      <option value="off">Off</option>
      {templates.map((template) => (
        <option key={template.id} value={template.id} title={template.description ?? template.name}>
          {template.name}
        </option>
      ))}
    </select>
  );
}
