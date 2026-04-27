import { SectionHeader, Reveal } from "./Section";

const tech = [
  { layer: "Frontend", name: "React + TypeScript + Tailwind", desc: "Interface responsiva e moderna. Componentes reutilizáveis." },
  { layer: "Geração de código", name: "Lovable + Claude Code", desc: "Desenvolvimento 10× mais rápido com IA generativa." },
  { layer: "Banco de dados", name: "Supabase (PostgreSQL)", desc: "Auth, banco, storage e APIs em tempo real." },
  { layer: "Dados eleitorais", name: "Portal Dados Abertos TSE", desc: "Dados oficiais de 2012 a 2024. Sem custo de licença." },
  { layer: "Mapas", name: "Leaflet.js + IBGE Shapefiles", desc: "Visualização geográfica interativa. Zero custo de API." },
  { layer: "Comunicação", name: "Evolution API + n8n", desc: "Automação WhatsApp self-hosted. Sem custo adicional." },
  { layer: "Gráficos", name: "Recharts / Chart.js", desc: "Dashboards com animação e interação nativa." },
  { layer: "Pagamentos", name: "Mercado Pago", desc: "Assinaturas e avulsos. 3,49% só sobre receita." },
  { layer: "Infraestrutura", name: "VPS + Nginx + Docker", desc: "Alta disponibilidade. Infraestrutura já existente." },
];

export function TechStack() {
  return (
    <section id="tech" className="py-20 md:py-28 px-6 md:px-12" style={{ background: "var(--ma-bg)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          <SectionHeader
            center
            label="Stack tecnológico"
            title={<>Tecnologia que <span className="ma-gradient-text">escala.</span><br />Custo que cabe no orçamento.</>}
            subtitle="Stack moderno, open source onde possível e totalmente controlado — sem dependência de plataformas caras."
          />
        </div>

        <Reveal className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {tech.map((t) => (
            <div key={t.name} className="ma-card p-6">
              <div
                className="font-mono text-[9px] tracking-widest uppercase mb-2"
                style={{ color: "var(--ma-purple-light)" }}
              >
                {t.layer}
              </div>
              <div className="text-sm font-bold text-white mb-1.5">{t.name}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{t.desc}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
