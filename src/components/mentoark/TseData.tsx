import { Check } from "lucide-react";
import { SectionHeader, Reveal } from "./Section";

const rows = [
  ["Resultados nominais por candidato", "2012–2024"],
  ["Votos por município, zona e seção", "Todo Brasil"],
  ["Detalhamento por bairro e local", "5.563 municípios"],
  ["Perfil do eleitorado por seção", "Faixa etária, gênero"],
  ["Dados cadastrais dos candidatos", "Foto, partido, número"],
  ["Shapefiles de municípios IBGE", "Para mapas interativos"],
];

export function TseData() {
  return (
    <section id="dados" className="py-20 md:py-28 px-6 md:px-12" style={{ background: "var(--ma-bg2)" }}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          label="Base de dados"
          title={<>Dados oficiais do TSE.<br /><span className="ma-gradient-text">Gratuitos. Confiáveis.</span></>}
        />

        <Reveal className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
          <div>
            <p className="text-sm md:text-[15px] text-slate-400 leading-relaxed mb-6">
              O TSE disponibiliza gratuitamente pelo portal{" "}
              <strong style={{ color: "var(--ma-purple-light)" }}>dadosabertos.tse.jus.br</strong>{" "}
              todos os dados históricos de eleições. Sem custo de licença — incorporados ao banco
              uma única vez e disponíveis em tempo real.
            </p>
            <div className="flex flex-col">
              {rows.map(([item, info], i) => (
                <div
                  key={item}
                  className="flex items-center justify-between gap-3 py-3"
                  style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--ma-border2)" : "none" }}
                >
                  <div className="flex items-center gap-2.5 text-sm text-slate-200">
                    <Check size={14} style={{ color: "var(--ma-purple-light)" }} />
                    <span>{item}</span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 text-right shrink-0">{info}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            {[
              { v: "5.563", t: "municípios cobertos com dados de 2012 a 2024 — sem custo de licença." },
              { v: "R$ 0", t: "Custo de licença dos dados eleitorais. Download único, fica no banco." },
              { v: "6 eleições", t: "Municipais e federais de 2012 a 2024 — histórico completo disponível." },
            ].map((c) => (
              <div
                key={c.v}
                className="rounded-2xl p-6"
                style={{ background: "var(--ma-bg3)", border: "1px solid var(--ma-border)" }}
              >
                <div className="text-3xl md:text-4xl font-black ma-gradient-text leading-none mb-2">
                  {c.v}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{c.t}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
