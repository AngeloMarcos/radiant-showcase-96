import { useMemo, useState } from "react";
import {
  calcMinutos, calcElevenLabs, calcPlayht, calcPolly, calcGpt, calcVenda,
  calcPlanos, calcAnual, GPT_PRICES, fmtBRL, fmtUSD, fmtNum, type GptModel,
} from "./lib/calc";
import { SliderInput } from "./ui/SliderInput";
import { StatCard } from "./ui/StatCard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import {
  Calculator as CalcIcon, Mic, MessageSquare, Wrench, TrendingUp,
  AlertTriangle, Lightbulb, Copy, Check, Sparkles,
} from "lucide-react";

type AudioTool = "elevenlabs" | "playht" | "polly" | "comparar";

interface Cenario {
  nome: string;
  descricao: string;
  pctAudio: number;
  pctMo: number;
  recomendado?: boolean;
}
const CENARIOS: Cenario[] = [
  { nome: "C1 — Só Áudio",         descricao: "100% áudio · 100% MO",        pctAudio: 100, pctMo: 100 },
  { nome: "C2 — Equilibrado",      descricao: "50% áudio · 50% MO",          pctAudio: 50,  pctMo: 50 },
  { nome: "C3 — Mix Inteligente",  descricao: "30% áudio · 40% MO",          pctAudio: 30,  pctMo: 40, recomendado: true },
  { nome: "C4 — Texto Dominante",  descricao: "10% áudio · 30% MO",          pctAudio: 10,  pctMo: 30 },
];

export function Calculator() {
  // ===== Estado =====
  const [totalDisparos, setTotalDisparos] = useState(5000);
  const [pctAudio, setPctAudio] = useState(30);
  const [duracaoSeg, setDuracaoSeg] = useState(10);
  const [moBase, setMoBase] = useState(2500);
  const [pctMo, setPctMo] = useState(40);
  const [cambio, setCambio] = useState(5.80);
  const [setup, setSetup] = useState(4500);
  const [ferramentaAudio, setFerramentaAudio] = useState<AudioTool>("elevenlabs");
  const [modeloGpt, setModeloGpt] = useState<GptModel>("gpt4o-mini");
  const [tokensPorMsg, setTokensPorMsg] = useState(200);
  const [mostrarAnual, setMostrarAnual] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // ===== Cálculos memorizados =====
  const calc = useMemo(() => {
    const { audiosMes, minutosMes } = calcMinutos(totalDisparos, pctAudio, duracaoSeg);
    const eleven = calcElevenLabs(minutosMes);
    const playht = calcPlayht(minutosMes);
    const polly = calcPolly(minutosMes);
    const gpt = calcGpt(totalDisparos, pctAudio, tokensPorMsg, modeloGpt);

    const audioUsd =
      ferramentaAudio === "elevenlabs" ? eleven.totalUsd :
      ferramentaAudio === "playht"     ? playht.totalUsd :
      ferramentaAudio === "polly"      ? polly.totalUsd :
      eleven.totalUsd; // "comparar" usa eleven como base principal
    const audioLabel =
      ferramentaAudio === "elevenlabs" ? `ElevenLabs ${eleven.plano.nome}` :
      ferramentaAudio === "playht"     ? "Play.ht" :
      ferramentaAudio === "polly"      ? "Amazon Polly" :
      `ElevenLabs ${eleven.plano.nome} (referência)`;

    const custoApiUsd = audioUsd + gpt.totalUsd;
    const custoApiBrl = custoApiUsd * cambio;
    const custoMoBrl = moBase * (pctMo / 100);
    const custoTotalMes = custoApiBrl + custoMoBrl;
    const custoPrimeiroMes = custoTotalMes + setup;
    const venda = calcVenda(custoTotalMes, setup, 0.40);

    return {
      audiosMes, minutosMes,
      eleven, playht, polly, gpt,
      audioUsd, audioLabel,
      custoApiUsd, custoApiBrl, custoMoBrl,
      custoTotalMes, custoPrimeiroMes,
      ...venda,
    };
  }, [totalDisparos, pctAudio, duracaoSeg, moBase, pctMo, cambio, setup, ferramentaAudio, modeloGpt, tokensPorMsg]);

  const planos = useMemo(() => calcPlanos(calc.precoVenda, setup), [calc.precoVenda, setup]);
  const anual = useMemo(() => calcAnual(calc.custoTotalMes, calc.precoVenda, setup), [calc.custoTotalMes, calc.precoVenda, setup]);

  // ===== Dados do gráfico comparativo =====
  const chartData = useMemo(() => {
    const gptBrl = calc.gpt.totalUsd * cambio;
    return [
      { ferramenta: "ElevenLabs", audio: calc.eleven.totalUsd * cambio, texto: gptBrl, mo: calc.custoMoBrl },
      { ferramenta: "Play.ht",    audio: calc.playht.totalUsd * cambio, texto: gptBrl, mo: calc.custoMoBrl },
      { ferramenta: "Amazon Polly", audio: calc.polly.totalUsd * cambio, texto: gptBrl, mo: calc.custoMoBrl },
    ];
  }, [calc, cambio]);

  // ===== Alertas =====
  const alertas: { tipo: "warn"|"info"|"danger"; texto: string }[] = [];
  if (calc.eleven.excedenteMin > 0 && calc.eleven.excedenteMin / calc.eleven.plano.minutosInclusos > 0.30) {
    alertas.push({ tipo: "warn", texto: "Excedente alto no ElevenLabs — considere subir de plano para reduzir custo." });
  }
  if (calc.custoMoBrl > calc.custoApiBrl) {
    alertas.push({ tipo: "info", texto: "Sua mão de obra é o maior custo — considere aumentar o preço de venda." });
  }
  if (calc.margemPct < 30) {
    alertas.push({ tipo: "danger", texto: "Margem abaixo de 30% — revise o preço de venda." });
  }
  if (calc.playht.totalUsd > 0 && calc.playht.totalUsd < calc.eleven.totalUsd * 0.3) {
    alertas.push({ tipo: "info", texto: "Play.ht está 3x+ mais barato neste volume — mas avalie a estabilidade da entrega." });
  }

  // ===== Cenários =====
  function aplicarCenario(c: Cenario) {
    setPctAudio(c.pctAudio);
    setPctMo(c.pctMo);
  }

  // ===== Copiar proposta =====
  function copiarProposta() {
    const linhas = [
      "PROPOSTA — Automação de Disparos com IA (WhatsApp)",
      "",
      `Volume: ${fmtNum(totalDisparos)} disparos/mês  |  ${pctAudio}% áudio  ·  ${100 - pctAudio}% texto`,
      "",
      ...planos.map(p => [
        `### ${p.nome}${p.destaque ? "  ⭐ Recomendado" : ""}`,
        `Mensalidade: ${fmtBRL(p.preco)}`,
        `Setup: ${fmtBRL(p.setup)}`,
        ...p.features.map(f => `• ${f}`),
        "",
      ].join("\n")),
    ].join("\n");
    navigator.clipboard.writeText(linhas).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  const breakdown = [
    { item: `${calc.audioLabel}`, usd: calc.audioUsd, brl: calc.audioUsd * cambio },
    { item: `${GPT_PRICES[modeloGpt].label} / texto`, usd: calc.gpt.totalUsd, brl: calc.gpt.totalUsd * cambio },
    { item: "n8n (self-hosted)", usd: 0, brl: 0 },
    { item: `Mão de obra (${pctMo}%)`, usd: null, brl: calc.custoMoBrl },
  ];
  const subtotalApiBrl = calc.custoApiBrl;

  return (
    <div className="tts-app tts-grid-bg">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-10">

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[var(--tts-border)] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalcIcon className="size-5 text-[var(--tts-orange)]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--tts-orange)]">
                Pricing engine v1.0
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight">
              TTS Cost <span style={{ color: "var(--tts-orange)" }}>Calculator</span>
            </h1>
            <p className="text-sm text-[var(--tts-muted)] mt-2 max-w-xl">
              Calcule custos de API, infraestrutura e mão de obra para soluções de disparo
              com áudio e texto via WhatsApp. Recálculo em tempo real.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="tts-badge tts-badge-orange">ElevenLabs</span>
            <span className="tts-badge tts-badge-cyan">Play.ht</span>
            <span className="tts-badge tts-badge-ok">Polly</span>
            <span className="tts-badge tts-badge-orange">OpenAI</span>
          </div>
        </header>

        {/* Cenários */}
        <section>
          <SectionTitle icon={<Sparkles className="size-4" />} title="Cenários rápidos" hint="Aplique presets aos sliders" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {CENARIOS.map(c => (
              <button
                key={c.nome}
                onClick={() => aplicarCenario(c)}
                className={`tts-card p-4 text-left group transition-all hover:-translate-y-0.5 ${
                  c.recomendado ? "!border-[var(--tts-orange)]" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display font-bold text-sm">{c.nome}</span>
                  {c.recomendado && <span className="tts-badge tts-badge-orange">Recomendado</span>}
                </div>
                <p className="text-xs text-[var(--tts-muted)] font-mono">{c.descricao}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Configuração + Ferramentas */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config base */}
          <div className="tts-card p-6 space-y-6 lg:col-span-2">
            <SectionTitle icon={<Wrench className="size-4" />} title="Configuração base" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <SliderInput label="Disparos / mês"     value={totalDisparos} onChange={setTotalDisparos} min={1000} max={500000} step={500} />
              <SliderInput label="% Áudio"             value={pctAudio}      onChange={setPctAudio}      min={0} max={100} suffix="%" hint={`Texto: ${100 - pctAudio}%`} />
              <SliderInput label="Duração / áudio"    value={duracaoSeg}    onChange={setDuracaoSeg}    min={5} max={120} suffix="s" />
              <SliderInput label="Tokens / msg texto" value={tokensPorMsg}  onChange={setTokensPorMsg}  min={50} max={2000} step={10} />
              <SliderInput label="MO base mensal"      value={moBase}        onChange={setMoBase}        min={0} max={20000} step={100} suffix="R$" />
              <SliderInput label="% MO aplicada"       value={pctMo}         onChange={setPctMo}         min={0} max={100} suffix="%" hint={`= ${fmtBRL(moBase * pctMo / 100)}`} />
              <NumberField label="Câmbio USD → BRL" value={cambio} onChange={setCambio} step={0.05} />
              <NumberField label="Setup (one-time)" value={setup}  onChange={setSetup}  step={100} suffix="R$" />
            </div>
          </div>

          {/* Ferramentas */}
          <div className="tts-card p-6 space-y-6">
            <SectionTitle icon={<Mic className="size-4" />} title="Ferramentas" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-2">Áudio</div>
              <div className="grid grid-cols-2 gap-2">
                {(["elevenlabs", "playht", "polly", "comparar"] as AudioTool[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setFerramentaAudio(t)}
                    className={`tts-btn !text-xs ${ferramentaAudio === t ? "tts-btn-active" : ""}`}
                  >
                    {t === "elevenlabs" ? "ElevenLabs"
                      : t === "playht" ? "Play.ht"
                      : t === "polly" ? "Amazon Polly"
                      : "Comparar"}
                  </button>
                ))}
              </div>
              {ferramentaAudio === "elevenlabs" && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-[var(--tts-muted)] font-mono">Plano ótimo:</span>
                  <span className="font-mono text-xs">{calc.eleven.plano.nome}</span>
                  <span className={`tts-badge tts-badge-${calc.eleven.status === "ok" ? "ok" : calc.eleven.status === "warn" ? "warn" : "danger"}`}>
                    {calc.eleven.status === "ok" ? "Sem excedente"
                      : calc.eleven.status === "warn" ? `Exc. ${fmtNum(calc.eleven.excedenteMin)}min`
                      : `Exc. ${fmtNum(calc.eleven.excedenteMin)}min ⚠`}
                  </span>
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-2">Texto (GPT)</div>
              <div className="grid grid-cols-2 gap-2">
                {(["gpt4o-mini", "gpt4o"] as GptModel[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setModeloGpt(m)}
                    className={`tts-btn !text-xs ${modeloGpt === m ? "tts-btn-active" : ""}`}
                  >
                    {GPT_PRICES[m].label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--tts-muted)] font-mono mt-2">
                {GPT_PRICES[modeloGpt].label}: ${GPT_PRICES[modeloGpt].input}/1M in · ${GPT_PRICES[modeloGpt].output}/1M out
              </p>
            </div>
            <div className="text-xs text-[var(--tts-muted)] font-mono pt-3 border-t border-[var(--tts-border)] space-y-1">
              <div>Áudios/mês: <span className="text-[var(--tts-text)]">{fmtNum(calc.audiosMes)}</span></div>
              <div>Minutos/mês: <span className="text-[var(--tts-text)]">{fmtNum(calc.minutosMes)}</span></div>
              <div>Textos/mês: <span className="text-[var(--tts-text)]">{fmtNum(calc.gpt.textosMes)}</span></div>
            </div>
          </div>
        </section>

        {/* Alertas */}
        {alertas.length > 0 && (
          <section className="space-y-2">
            {alertas.map((a, i) => (
              <div
                key={i}
                className={`tts-card p-3 flex items-start gap-3 tts-fade-in ${
                  a.tipo === "danger" ? "!border-[var(--tts-red)]"
                  : a.tipo === "warn" ? "!border-[var(--tts-gold)]"
                  : "!border-[var(--tts-cyan)]"
                }`}
              >
                {a.tipo === "info"
                  ? <Lightbulb className="size-4 text-[var(--tts-cyan)] mt-0.5 shrink-0" />
                  : <AlertTriangle className={`size-4 mt-0.5 shrink-0 ${a.tipo === "danger" ? "text-[var(--tts-red)]" : "text-[var(--tts-gold)]"}`} />}
                <p className="text-sm">{a.texto}</p>
              </div>
            ))}
          </section>
        )}

        {/* Resultados principais */}
        <section>
          <SectionTitle icon={<TrendingUp className="size-4" />} title="Resultados" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Custo API / mês" value={fmtBRL(calc.custoApiBrl)} sub={fmtUSD(calc.custoApiUsd)} accent="cyan" />
            <StatCard label="Mão de obra / mês" value={fmtBRL(calc.custoMoBrl)} sub={`${pctMo}% de ${fmtBRL(moBase)}`} />
            <StatCard label="Custo total / mês" value={fmtBRL(calc.custoTotalMes)} accent="orange" large />
            <StatCard label="1º mês (com setup)" value={fmtBRL(calc.custoPrimeiroMes)} sub={`+ ${fmtBRL(setup)} setup`} accent="gold" />
            <StatCard label="Preço de venda" value={fmtBRL(calc.precoVenda)} sub="margem 40%" accent="green" large />
            <StatCard label="Lucro / mês" value={fmtBRL(calc.lucroMes)} sub={`${calc.margemPct.toFixed(1)}% de margem`} accent="green" />
            <StatCard label="Faturamento anual" value={fmtBRL(calc.faturamentoAnual)} sub="12 meses + setup" accent="cyan" />
            <StatCard label="Lucro anual" value={fmtBRL(calc.lucroMes * 12)} accent="green" />
          </div>
        </section>

        {/* Breakdown */}
        <section>
          <SectionTitle icon={<MessageSquare className="size-4" />} title="Breakdown detalhado" />
          <div className="tts-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono border-b border-[var(--tts-border)]">
                    <th className="text-left p-3">Item</th>
                    <th className="text-right p-3">USD</th>
                    <th className="text-right p-3">BRL</th>
                    <th className="text-right p-3">% total</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {breakdown.map((b) => (
                    <tr key={b.item} className="border-b border-[var(--tts-border)]/60">
                      <td className="p-3">{b.item}</td>
                      <td className="p-3 text-right">{b.usd === null ? "—" : fmtUSD(b.usd)}</td>
                      <td className="p-3 text-right">{fmtBRL(b.brl)}</td>
                      <td className="p-3 text-right text-[var(--tts-muted)]">
                        {calc.custoTotalMes > 0 ? `${(b.brl / calc.custoTotalMes * 100).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[var(--tts-surface-2)]">
                    <td className="p-3 font-display font-bold">Subtotal APIs</td>
                    <td className="p-3 text-right">{fmtUSD(calc.custoApiUsd)}</td>
                    <td className="p-3 text-right">{fmtBRL(subtotalApiBrl)}</td>
                    <td className="p-3 text-right text-[var(--tts-muted)]">
                      {calc.custoTotalMes > 0 ? `${(subtotalApiBrl / calc.custoTotalMes * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                  <tr className="bg-[var(--tts-surface-2)]" style={{ color: "var(--tts-orange)" }}>
                    <td className="p-3 font-display font-bold text-base">TOTAL</td>
                    <td className="p-3 text-right">—</td>
                    <td className="p-3 text-right text-base font-bold">{fmtBRL(calc.custoTotalMes)}</td>
                    <td className="p-3 text-right">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Gráfico comparativo */}
        <section>
          <SectionTitle icon={<TrendingUp className="size-4" />} title="Comparativo de ferramentas (BRL)" hint="Custo total por ferramenta no volume atual" />
          <div className="tts-card p-4 md:p-6">
            <div style={{ width: "100%", height: 360 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" />
                  <XAxis dataKey="ferramenta" stroke="#4f617a" tick={{ fill: "#d8e4f5", fontSize: 12 }} />
                  <YAxis stroke="#4f617a" tick={{ fill: "#4f617a", fontSize: 11 }}
                    tickFormatter={(v) => "R$" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0))} />
                  <Tooltip
                    contentStyle={{ background: "#0d1119", border: "1px solid #1a2235", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => fmtBRL(v)}
                    cursor={{ fill: "rgba(255,107,43,0.05)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="audio" stackId="a" fill="#ff6b2b" name="Áudio" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="texto" stackId="a" fill="#00d4ff" name="Texto (GPT)" />
                  <Bar dataKey="mo" stackId="a" fill="#a78bfa" name="Mão de obra" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Proposta */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle icon={<Sparkles className="size-4" />} title="Proposta para o cliente" />
            <button onClick={copiarProposta} className="tts-btn !text-xs">
              {copiado ? <><Check className="size-3" /> Copiado!</> : <><Copy className="size-3" /> Copiar Proposta</>}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {planos.map(p => (
              <div
                key={p.nome}
                className={`tts-card p-6 flex flex-col ${p.destaque ? "!border-[var(--tts-orange)] relative md:-translate-y-2" : ""}`}
              >
                {p.destaque && (
                  <span className="tts-badge tts-badge-orange absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--tts-bg)]">
                    Recomendado
                  </span>
                )}
                <h3 className="font-display text-2xl font-bold mb-1">{p.nome}</h3>
                <div className="font-mono text-3xl font-bold my-3" style={{ color: p.destaque ? "var(--tts-orange)" : "var(--tts-text)" }}>
                  {fmtBRL(p.preco)}
                  <span className="text-xs text-[var(--tts-muted)] font-normal">/mês</span>
                </div>
                <p className="text-xs text-[var(--tts-muted)] font-mono mb-4">Setup: {fmtBRL(p.setup)}</p>
                <ul className="space-y-2 text-sm flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="size-4 text-[var(--tts-green)] mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Tabela anual */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle icon={<TrendingUp className="size-4" />} title="Projeção anual (12 meses)" />
            <button onClick={() => setMostrarAnual(v => !v)} className="tts-btn !text-xs">
              {mostrarAnual ? "Ocultar" : "Mostrar"} tabela
            </button>
          </div>
          {mostrarAnual && (
            <div className="tts-card overflow-x-auto tts-fade-in">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] border-b border-[var(--tts-border)]">
                    <th className="text-left p-3">Mês</th>
                    <th className="text-right p-3">Custo</th>
                    <th className="text-right p-3">Receita</th>
                    <th className="text-right p-3">Lucro</th>
                    <th className="text-right p-3">Lucro acum.</th>
                  </tr>
                </thead>
                <tbody>
                  {anual.map(m => (
                    <tr key={m.mes} className="border-b border-[var(--tts-border)]/60">
                      <td className="p-3">Mês {m.mes}{m.mes === 1 && <span className="ml-2 tts-badge tts-badge-warn">Setup</span>}</td>
                      <td className="p-3 text-right">{fmtBRL(m.custo)}</td>
                      <td className="p-3 text-right">{fmtBRL(m.receita)}</td>
                      <td className="p-3 text-right" style={{ color: "var(--tts-green)" }}>{fmtBRL(m.lucro)}</td>
                      <td className="p-3 text-right" style={{ color: "var(--tts-green)" }}>{fmtBRL(m.lucroAcum)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="pt-8 border-t border-[var(--tts-border)] text-xs text-[var(--tts-muted)] font-mono text-center">
          TTS Cost Calculator · cálculo client-side · valores referenciais sujeitos a alteração de preços nas APIs
        </footer>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-[var(--tts-orange)]">{icon}</span>
        <h2 className="font-display text-xl md:text-2xl font-bold">{title}</h2>
      </div>
      {hint && <span className="text-xs text-[var(--tts-muted)] font-mono hidden sm:block">{hint}</span>}
    </div>
  );
}

function NumberField({ label, value, onChange, step = 1, suffix }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider text-[var(--tts-muted)] font-mono">{label}</label>
      <div className="flex items-center gap-2">
        {suffix && <span className="text-xs text-[var(--tts-muted)] font-mono">{suffix}</span>}
        <input
          type="number"
          className="tts-input"
          value={value}
          step={step}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v)) onChange(v);
          }}
        />
      </div>
    </div>
  );
}
