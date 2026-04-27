import { useState } from "react";
import { Check } from "lucide-react";
import { SectionHeader, Reveal } from "./Section";

type Plan = {
  name: string;
  monthly: number;
  feats: string[];
  featured?: boolean;
};

const plans: Plan[] = [
  {
    name: "Essencial",
    monthly: 117,
    feats: ["Até 2.000 contatos", "Planejamento municipal", "Consulta eleitoral completa", "Comparativo de candidatos"],
  },
  {
    name: "Profissional",
    monthly: 197,
    feats: ["Até 5.000 contatos", "API WhatsApp incluída", "Todos os módulos", "Dashboard em tempo real", "Relatório web mensal"],
    featured: true,
  },
  {
    name: "Elite",
    monthly: 287,
    feats: ["Contatos ilimitados", "Todos os recursos", "Suporte prioritário", "IA preditiva (roadmap)"],
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  const price = (m: number) => (annual ? Math.round(m * 10) : m);
  const period = annual ? "/ano" : "/mês";

  return (
    <section id="planos" className="py-20 md:py-28 px-6 md:px-12" style={{ background: "var(--ma-bg2)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          <SectionHeader
            center
            label="Modelo de receita"
            title={<>Planos para cada<br /><span className="ma-gradient-text">tipo de candidato.</span></>}
            subtitle="Do vereador ao deputado federal — uma solução para cada perfil de campanha."
          />

          {/* Toggle mensal/anual */}
          <div
            className="inline-flex mt-8 p-1 rounded-full"
            style={{ background: "var(--ma-bg3)", border: "1px solid var(--ma-border2)" }}
          >
            {[
              { k: false, label: "Mensal" },
              { k: true, label: "Anual · 2 meses grátis" },
            ].map((opt) => (
              <button
                key={String(opt.k)}
                onClick={() => setAnnual(opt.k)}
                className="px-4 md:px-5 py-2 rounded-full text-xs md:text-[13px] font-semibold transition-all"
                style={{
                  background: annual === opt.k ? "var(--ma-purple)" : "transparent",
                  color: annual === opt.k ? "#fff" : "var(--ma-muted)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Reveal className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-7 md:p-8 transition-all relative ${p.featured ? "" : "ma-card"}`}
              style={
                p.featured
                  ? {
                      background: "linear-gradient(145deg, var(--ma-purple), #4f46e5)",
                      boxShadow: "0 24px 70px rgba(124,58,237,.35)",
                      transform: "translateY(-4px)",
                    }
                  : undefined
              }
            >
              {p.featured && (
                <div
                  className="inline-block rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase mb-4 text-white"
                  style={{ background: "rgba(255,255,255,.22)" }}
                >
                  Mais popular
                </div>
              )}
              <div
                className="font-mono text-[10px] tracking-widest uppercase mb-3"
                style={{ color: p.featured ? "rgba(255,255,255,.6)" : "var(--ma-purple-light)" }}
              >
                Plano
              </div>
              <div className="text-xl font-extrabold text-white mb-5">{p.name}</div>
              <div className="flex items-baseline gap-1">
                <div className="text-5xl font-black text-white leading-none">R${price(p.monthly)}</div>
              </div>
              <div
                className="font-mono text-xs mt-1 mb-6"
                style={{ color: p.featured ? "rgba(255,255,255,.5)" : "var(--ma-muted2)" }}
              >
                {period}
              </div>
              <ul
                className="pt-5 flex flex-col gap-2"
                style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}
              >
                {p.feats.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2.5 text-[13px]"
                    style={{ color: p.featured ? "rgba(255,255,255,.9)" : "var(--ma-muted)" }}
                  >
                    <Check size={14} className="shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Reveal>

        <Reveal
          className="mt-4 rounded-2xl p-6 md:p-7 flex flex-col md:flex-row gap-4 md:items-center justify-between"
          style={{ background: "var(--ma-bg3)", border: "1px solid var(--ma-border)" }}
        >
          <div>
            <h4 className="text-base md:text-lg font-bold text-white mb-1">Relatório Avulso por Candidato</h4>
            <p className="text-xs md:text-sm text-slate-500">
              Mapa de calor + exportação Excel + análise por localidade. Venda única.
            </p>
          </div>
          <div className="text-left md:text-right">
            <div className="text-3xl md:text-4xl font-black ma-gradient-text leading-none">R$100–140</div>
            <div className="font-mono text-[10px] text-slate-500 mt-1">por relatório</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
