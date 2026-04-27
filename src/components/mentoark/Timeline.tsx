import { SectionHeader, Reveal } from "./Section";

const phases = [
  { period: "Sem 1–2", phase: "Fase 01 · Fundação", title: "Base do projeto", desc: "Setup Supabase, importação dados TSE, estrutura do banco, autenticação." },
  { period: "Sem 3–4", phase: "Fase 02 · Módulo core", title: "Consulta eleitoral", desc: "Busca por candidato, filtros por UF/município/zona/bairro, tabelas e gráficos." },
  { period: "Sem 5–6", phase: "Fase 03 · Visualização", title: "Mapas e comparativos", desc: "Leaflet + shapefiles IBGE, mapa de calor, comparativo entre candidatos." },
  { period: "Sem 7–8", phase: "Fase 04 · CRM", title: "Plataforma de campanha", desc: "CRM de contatos, atendimentos, planejamento de votos, dashboard e WhatsApp." },
  { period: "Sem 9–10", phase: "Fase 05 · Monetização", title: "Relatórios e pagamentos", desc: "Relatório por candidato, exportação Excel, integração Mercado Pago." },
  { period: "Sem 11–12", phase: "Fase 06 · Go-live", title: "Testes, ajustes e deploy", desc: "QA completo, otimizações, domínio e lançamento da plataforma." },
];

export function Timeline() {
  return (
    <section id="cronograma" className="py-20 md:py-28 px-6 md:px-12" style={{ background: "var(--ma-bg)" }}>
      <div className="max-w-3xl mx-auto">
        <SectionHeader
          label="Desenvolvimento"
          title={<>Pronto em <span className="ma-gradient-text">12 semanas.</span><br />Com IA, não meses.</>}
        />

        <Reveal className="mt-10 relative">
          {/* Vertical line */}
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: "20px",
              background: "linear-gradient(to bottom, transparent, var(--ma-border) 8%, var(--ma-border) 92%, transparent)",
            }}
          />

          <div className="flex flex-col gap-3">
            {phases.map((p) => (
              <div key={p.period} className="relative pl-12">
                <div
                  className="absolute left-[14px] top-5 w-3 h-3 rounded-full"
                  style={{
                    background: "var(--ma-purple)",
                    boxShadow: "0 0 0 3px var(--ma-purple-dim), 0 0 0 6px rgba(124,58,237,.15)",
                  }}
                />
                <div
                  className="rounded-xl p-4 md:p-5 transition-colors"
                  style={{ background: "var(--ma-bg2)", border: "1px solid var(--ma-border2)" }}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span
                      className="font-mono text-[10px] font-semibold tracking-wider"
                      style={{ color: "var(--ma-purple-light)" }}
                    >
                      {p.period}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="font-mono text-[9px] tracking-widest uppercase text-slate-500">
                      {p.phase}
                    </span>
                  </div>
                  <div className="text-sm md:text-[15px] font-bold text-white mb-1">{p.title}</div>
                  <div className="text-xs md:text-[13px] text-slate-500 leading-relaxed">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
