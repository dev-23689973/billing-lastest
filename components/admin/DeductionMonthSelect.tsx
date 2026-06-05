"use client";

import { FormSelect } from "@/components/forms/form-select";

function monthOptions(compact?: boolean) {
  return Array.from({ length: 24 }, (_, i) => {
    const m = i + 1;
    return {
      value: String(m),
      label: compact ? `${m} mo` : `${m} ${m === 1 ? "month" : "months"}`,
    };
  });
}

export function DeductionMonthSelect({
  id,
  name,
  defaultMonth,
  value,
  onChange,
  className,
  compact,
}: {
  id: string;
  name?: string;
  defaultMonth?: number;
  value?: number;
  onChange?: (month: number) => void;
  className?: string;
  /** Shorter labels and trigger for tier tables. */
  compact?: boolean;
}) {
  const controlled = value != null;
  return (
    <FormSelect
      id={id}
      name={name}
      options={monthOptions(compact)}
      clampMenuToTrigger={compact}
      value={controlled ? String(value) : undefined}
      defaultValue={controlled ? undefined : String(defaultMonth ?? 1)}
      onValueChange={onChange ? (v) => onChange(Number.parseInt(v, 10) || 1) : undefined}
      className={className}
    />
  );
}
