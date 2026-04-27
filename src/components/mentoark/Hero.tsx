import { useEffect, useRef } from "react";
import { useCountUp } from "./hooks";

function Stat({
  value,
  prefix = "",
  suffix = "",
  label,
  delay = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  delay?: number;
}) {
  const { ref, value: v } = useCountUp(value, 1400 + delay);
  const formatted = v.toLocaleString("pt-BR");
  return (
    <div
      className="text-center px-5 py-4 rounded-xl flex-1 min-w-[120px]"
      style={{
        background: "rgba(124,58,237,0.08)",
        border: "1px solid var(--ma-border)",
      }}
    >
      <div className="text-xl md:text-2xl font-extrabold text-white leading-tight">
        <span ref={ref}>{prefix}{formatted}{suffix}</span>
      </div>
      <div className="text-[10px] md:text-[11px] font-mono uppercase tracking-widest text-slate-400 mt-1">
        {label}
      </div>
    </div>
  );
}

export function Hero() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!glowRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      glowRef.current.style.transform = `translate(calc(-50% + ${x}px), ${y}px)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center px-6 md:px-12 pt-24 pb-16 overflow-hidden"
    >
      <div
        ref={glowRef}
        className="ma-glow"
        style={{
          top: "-200px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(900px, 110vw)",
          height: "600px",
          transition: "transform .4s ease-out",
        }}
      />
      <div
        className="ma-glow"
        style={{
          bottom: "-100px",
          right: "-100px",
          width: "500px",
          height: "500px",
          background:
            "radial-gradient(ellipse at center, rgba(124,58,237,.1) 0%, transparent 60%)",
        }}
      />
      <div className="absolute inset-0 ma-grid-bg pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <div className="ma-chip ma-fade-up" style={{ animationDelay: ".15s" }}>
          <span
            className="ma-pulse-dot inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--ma-purple-light)" }}
          />
          Plataforma Eleitoral · Abril 2026
        </div>

        <h1
          className="font-black tracking-tight leading-[1.05] mt-7 ma-fade-up"
          style={{ fontSize: "clamp(38px, 7vw, 76px)", animationDelay: ".3s" }}
        >
          Inteligência <span className="ma-gradient-text">Eleitoral</span>
          <br />
          para Campanhas
          <br />
          que Vencem
        </h1>

        <p
          className="mt-6 max-w-xl mx-auto text-slate-400 leading-relaxed ma-fade-up"
          style={{ fontSize: "clamp(14px, 1.6vw, 17px)", animationDelay: ".45s" }}
        >
          Sistema completo de consulta eleitoral, gestão de campanha e análise de
          dados — com dados oficiais do TSE e automação via WhatsApp.
        </p>

        <div
          className="mt-9 flex flex-col sm:flex-row gap-3 items-center justify-center ma-fade-up"
          style={{ animationDelay: ".6s" }}
        >
          <a href="#modulos" className="ma-btn-primary w-full sm:w-auto justify-center">
            Ver a plataforma →
          </a>
          <a href="#planos" className="ma-btn-secondary w-full sm:w-auto justify-center">
            Planos e valores
          </a>
        </div>

        <div
          className="mt-12 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 justify-center ma-fade-up"
          style={{ animationDelay: ".75s" }}
        >
          <Stat value={12} label="anos de dados" />
          <Stat value={5563} label="municípios" delay={100} />
          <Stat value={220} prefix="R$" label="custo/mês" delay={200} />
          <Stat value={12} suffix="sem" label="para go-live" delay={300} />
        </div>
      </div>
    </section>
  );
}
