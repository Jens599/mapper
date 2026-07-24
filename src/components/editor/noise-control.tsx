"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type NoiseControlProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
};

export function NoiseControl({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: NoiseControlProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commitValue(nextValue: number) {
    if (!Number.isFinite(nextValue)) return;
    onChange(Math.min(max, Math.max(min, nextValue)));
  }

  function commitDraft() {
    const nextValue = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(nextValue)) {
      setDraft(String(value));
      return;
    }
    commitValue(nextValue);
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-[13px] font-medium">
          {label}
        </Label>
        <div className="relative w-[5.5rem]">
          <Input
            id={id}
            type="number"
            min={min}
            max={max}
            step={step}
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setDraft(String(value));
                event.currentTarget.blur();
              }
            }}
            className="h-7 pr-7 text-right font-mono text-xs tabular-nums"
          />
          {unit ? (
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center font-mono text-[10px] text-muted-foreground">
              {unit}
            </span>
          ) : null}
        </div>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(nextValue) => commitValue(nextValue[0] ?? value)}
      />
    </div>
  );
}
