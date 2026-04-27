import { Landmark, Smartphone, Sparkles, Flag, Zap, TrendingUp } from "lucide-react";
import { SectionHeader, Reveal } from "./Section";

const items = [
  { Icon: Landmark, title: "Dados oficiais TSE", text: "Direto da fonte. Sem intermediários, sem licença. Atualizados a cada eleição." },
  { Icon: Smartphone, title: "WhatsApp nativo", text: "Evolution API integrada — funcionalidade que concorrentes cobram como add-on caro." },
  { Icon: Sparkles, title: "IA no roadmap", text: "Análise preditiva de votos e chat de estratégia com GPT-4 em fases futuras." },
  { Icon: Flag, title: "100% nacional", text: "Desenvolvido para o contexto eleitoral brasileiro, com LGPD e suporte em português." },
  { Icon: Zap, title: "Entrega 10× mais rápida", text: "Lovable + Claude Code — 12 semanas do zero ao go-live." },
  { Icon: TrendingUp, title: "Margem de ~89%", text: "Stack open source e self-hosted. Custo fixo de R$220/mês. Escala sem explodir custos." },
];

export function Differentials() {
  return (
    <section className="py-20 md:py-28 px-6 md:px-12" style={{ background: "var(--ma-bg2)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          <SectionHeader
            center
            label="Diferenciais"
            title={<>Por que a MentoArk.<br /><span className="ma-gradient-text">Não outra empresa.</span></>}
            subtitle="Tecnologia de ponta aplicada ao contexto eleitoral brasileiro — com margem, velocidade e controle total."
          />
        </div>

        <Reveal className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ Icon, title, text }) => (
            <div key={title} className="ma-card p-7">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(124,58,237,.15)", color: "var(--ma-purple-light)" }}
              >
                <Icon size={20} />
              </div>
              <div className="text-[15px] font-bold text-white mb-2">{title}</div>
              <div className="text-xs md:text-[13px] text-slate-500 leading-relaxed">{text}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
