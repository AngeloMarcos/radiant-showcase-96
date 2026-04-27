import { SectionHeader, Reveal } from "./Section";

const modules = [
  {
    n: "MÓDULO 01",
    title: "Consulta Eleitoral",
    desc: "Busca e visualização de resultados de 2012 a 2024 para todo o Brasil. Detalhamento por candidato, partido, município, zona, bairro e seção eleitoral.",
    tags: ["2012–2024", "5.563 municípios", "Tempo real"],
  },
  {
    n: "MÓDULO 02",
    title: "Comparativo de Candidatos",
    desc: "Comparação simultânea de até 3 candidatos ou pleitos. Gráficos de desempenho, evolução histórica e ranking por região com mapa interativo de calor.",
    tags: ["3 candidatos", "Histórico completo", "Mapa de calor"],
  },
  {
    n: "MÓDULO 03",
    title: "Gestão de Campanha",
    desc: "CRM completo: gestão de apoiadores, atendimentos, planejamento de votos por região, dashboard em tempo real, eventos e enquetes integradas.",
    tags: ["CRM completo", "Dashboard live", "WhatsApp nativo"],
  },
  {
    n: "MÓDULO 04",
    title: "Relatório Web com Mapa",
    desc: "Relatório interativo com mapa de calor de votos, exportação para Excel e análise por localidade. Gerado sob demanda — vendido por candidato.",
    tags: ["Mapa interativo", "Export Excel", "Por demanda"],
  },
];

export function Modules() {
  return (
    <section id="modulos" className="py-20 md:py-28 px-6 md:px-12" style={{ background: "var(--ma-bg2)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          <SectionHeader
            center
            label="O que será desenvolvido"
            title={<>Quatro módulos.<br /><span className="ma-gradient-text">Uma plataforma completa.</span></>}
            subtitle="Cada módulo foi pensado para uma etapa específica da campanha — da análise de dados à fidelização de apoiadores."
          />
        </div>

        <Reveal className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((m) => (
            <div key={m.n} className="ma-card p-7 md:p-9">
              <div
                className="font-mono text-[11px] font-semibold tracking-widest inline-block px-2.5 py-1 rounded-md mb-4"
                style={{ color: "var(--ma-purple-light)", background: "rgba(124,58,237,.12)" }}
              >
                {m.n}
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">{m.title}</h3>
              <p className="text-[13px] md:text-sm text-slate-400 leading-relaxed">{m.desc}</p>
              <div className="flex flex-wrap gap-2 mt-5">
                {m.tags.map((t) => (
                  <span key={t} className="ma-tag">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
