import type { ReactNode, CSSProperties } from "react";
import { useReveal } from "./hooks";

export function SectionHeader({
  label,
  title,
  subtitle,
  center = false,
}: {
  label: string;
  title: ReactNode;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "text-center" : ""}>
      <div className="ma-chip">{label}</div>
      <h2
        className="font-extrabold tracking-tight mt-4 leading-[1.15] text-white"
        style={{ fontSize: "clamp(26px, 4.2vw, 46px)" }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`text-slate-400 leading-relaxed mt-4 ${center ? "mx-auto" : ""}`}
          style={{ fontSize: "15px", maxWidth: "560px" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function Reveal({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`ma-reveal ${className}`} style={style}>
      {children}
    </div>
  );
}
