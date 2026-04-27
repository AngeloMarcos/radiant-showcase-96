import { SectionHeader, Reveal } from "./Section";

const items = [
  { name: "Dados TSE", note: "Download único · fica no banco", val: "R$ 0,00", free: true },
  { name: "Supabase Pro", note: "DB + auth + storage + realtime", val: "~R$ 140/mês" },
  { name: "VPS + domínio", note: "Infraestrutura já existente", val: "~R$ 80/mês" },
  { name: "Mapas (Leaflet + IBGE)", note: "Open source · sem API paga", val: "R$ 0,00", free: true },
  { name: "Evolution API WhatsApp", note: "Self-hosted no VPS", val: "R$ 0,00", free: true },
  { name: "Mercado Pago", note: "Cobrado só sobre receita", val: "3,49% por tx" },
];

export function Costs() {
  return (
    <section className="py-20 md:py-28 px-6 md:px-12" style={{ background: "var(--ma-bg)" }}>
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          label="Operação mensal"
          title={<>Custo previsível.<br /><span className="ma-gradient-text">Margem de ~89%.</span></>}
        />

        <Reveal className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 lg:gap-12 items-start">
          <div>
            {items.map((it, i) => (
              <div
                key={it.name}
                className="flex items-center justify-between gap-4 py-4"
                style={{ borderBottom: i < items.length - 1 ? "1px solid var(--ma-border2)" : "none" }}
              >
                <div>
                  <div className="text-sm md:text-[15px] font-medium text-slate-200">{it.name}</div>
                  <div className="font-mono text-[10px] text-slate-500 mt-0.5">{it.note}</div>
                </div>
                <div
                  className="font-mono font-semibold text-[13px] shrink-0"
                  style={{ color: it.free ? "var(--ma-purple-light)" : "var(--ma-text)" }}
                >
                  {it.val}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div
              className="rounded-2xl p-7 text-center text-white"
              style={{ background: "linear-gradient(135deg, var(--ma-purple), #4f46e5)" }}
            >
              <div className="font-mono text-[10px] font-bold tracking-widest uppercase opacity-70 mb-2">
                Total fixo / mês
              </div>
              <div className="text-5xl md:text-6xl font-black leading-none mb-1">R$220</div>
              <div className="font-mono text-[11px] opacity-60">excluindo taxas variáveis</div>
            </div>
            <div
              className="mt-3.5 rounded-xl p-5"
              style={{ background: "var(--ma-bg2)", border: "1px solid var(--ma-border)" }}
            >
              <p className="text-xs text-slate-400 leading-loose">
                10 clientes Profissional (R$197/mês)
                <br />
                Receita: <strong style={{ color: "var(--ma-purple-light)" }}>R$ 1.970/mês</strong>
                <br />
                Custo fixo: R$ 220
                <br />
                <strong style={{ color: "var(--ma-purple-light)" }}>Margem líquida: ~89%</strong>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
