import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: "default" | "orange" | "green" | "cyan" | "red" | "gold";
  large?: boolean;
}

const accentMap = {
  default: "var(--tts-text)",
  orange: "var(--tts-orange)",
  green: "var(--tts-green)",
  cyan: "var(--tts-cyan)",
  red: "var(--tts-red)",
  gold: "var(--tts-gold)",
};

export function StatCard({ label, value, sub, accent = "default", large = false }: Props) {
  return (
    <div className="tts-card-elevated p-5 flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--tts-muted)] font-mono">
        {label}
      </span>
      <div
        className={`tts-stat-num font-display ${large ? "text-3xl md:text-4xl" : "text-2xl"}`}
        style={{ color: accentMap[accent] }}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-[var(--tts-muted)] font-mono">{sub}</div>}
    </div>
  );
}
