import { Slider } from "@/components/ui/slider";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  hint?: string;
}

export function SliderInput({ label, value, onChange, min, max, step = 1, suffix, hint }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs uppercase tracking-wider text-[var(--tts-muted)] font-mono">
          {label}
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            className="tts-input !w-24 text-right"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
            }}
          />
          {suffix && <span className="text-xs text-[var(--tts-muted)] font-mono">{suffix}</span>}
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
      {hint && <p className="text-[10px] text-[var(--tts-muted)] font-mono">{hint}</p>}
    </div>
  );
}
