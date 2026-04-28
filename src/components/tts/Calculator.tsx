import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  calcMinutos, calcElevenLabs, calcPlayht, calcPolly, calcGpt, calcVenda,
  calcPlanos, calcAnual, calcRampUp, GPT_PRICES, fmtBRL, fmtUSD, fmtNum,
  calcularMaoDeObraPorNumero, calcularPercentualMaoDeObra,
  MO_PLANOS, MO_PRECO_LEGADO_POR_NUMERO,
  type GptModel, type RampMes, type AudioQuality, type MoPlanoId,
} from "./lib/calc";
import { SliderInput } from "./ui/SliderInput";
import { StatCard } from "./ui/StatCard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import {
  Calculator as CalcIcon, Mic, MessageSquare, Wrench, TrendingUp,
  AlertTriangle, Lightbulb, Copy, Check, Sparkles, Sun, Moon,
  RotateCcw, Save, Clock, Printer, FileDown,
} from "lucide-react";
import { jsPDF } from "jspdf";

type AudioTool = "elevenlabs" | "playht" | "polly" | "comparar";

const CHART_COLORS = {
  orange: "#8b5cf6",   // MentoArk Violet (primary highlight)
  cyan: "#3b82f6",     // MentoArk Blue
  purple: "#6366f1",   // MentoArk Indigo
  green: "#10b981",
  gold: "#f59e0b",
} as const;

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

interface SimulacaoSalva {
  id: number;
  cliente: string;
  disparos: number;
  pctAudio: number;
  duracaoSeg: number;
  ferramenta: string;
  modeloGpt: string;
  quantidadeNumeros: number;
  moPlanoId: MoPlanoId;
  cambio: number;
  setup: number;
  custoTotal: number;
  precoVenda: number;
  lucro: number;
  data: string;
}

export function Calculator() {
  // ===== Tema =====
  const [tema, setTema] = useState<"dark" | "light">("dark");
  // Hidrata do localStorage após o mount para evitar mismatch SSR/CSR
  useEffect(() => {
    const t = localStorage.getItem("tts_theme") as "dark" | "light" | null;
    if (t === "light" || t === "dark") setTema(t);
  }, []);
  function toggleTema() {
    const novo = tema === "dark" ? "light" : "dark";
    setTema(novo);
    if (typeof window !== "undefined") localStorage.setItem("tts_theme", novo);
  }

  // ===== Estado =====
  const [nomeCliente, setNomeCliente] = useState("");
  const [totalDisparos, setTotalDisparos] = useState(5000);
  const [pctAudio, setPctAudio] = useState(30);
  const [duracaoSeg, setDuracaoSeg] = useState(10);
  const [quantidadeNumeros, setQuantidadeNumeros] = useState(30);
  const [moPlanoId, setMoPlanoId] = useState<MoPlanoId>("padrao");
  const [cambio, setCambio] = useState(5.80);
  const [setup, setSetup] = useState(4500);
  const [ferramentaAudio, setFerramentaAudio] = useState<AudioTool>("elevenlabs");
  const [qualidade, setQualidade] = useState<AudioQuality>("good");
  const [modeloGpt, setModeloGpt] = useState<GptModel>("gpt4o-mini");
  const [tokensPorMsg, setTokensPorMsg] = useState(200);
  const [mostrarAnual, setMostrarAnual] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // ===== Histórico =====
  const [historico, setHistorico] = useState<SimulacaoSalva[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tts_history");
      if (raw) setHistorico(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [salvo, setSalvo] = useState(false);

  // ===== Cálculos memorizados =====
  const calc = useMemo(() => {
    const { audiosMes, minutosMes } = calcMinutos(totalDisparos, pctAudio, duracaoSeg);
    const eleven = calcElevenLabs(minutosMes, qualidade);
    const playht = calcPlayht(minutosMes);
    const polly = calcPolly(minutosMes);
    const gpt = calcGpt(totalDisparos, pctAudio, tokensPorMsg, modeloGpt);

    const audioUsd =
      ferramentaAudio === "elevenlabs" ? eleven.totalUsd :
      ferramentaAudio === "playht"     ? playht.totalUsd :
      ferramentaAudio === "polly"      ? polly.totalUsd :
      eleven.totalUsd;
    const audioLabel =
      ferramentaAudio === "elevenlabs" ? `ElevenLabs ${eleven.plano.nome}` :
      ferramentaAudio === "playht"     ? "Play.ht" :
      ferramentaAudio === "polly"      ? "Amazon Polly" :
      `ElevenLabs ${eleven.plano.nome} (referência)`;

    // Custos técnicos (APIs convertidas para BRL)
    const custoAudioBrl = audioUsd * cambio;
    const custoTextoBrl = gpt.totalUsd * cambio;
    const custoApiUsd = audioUsd + gpt.totalUsd;
    const custoApiBrl = custoAudioBrl + custoTextoBrl;
    const custoInfraBrl = 0; // n8n self-hosted
    const custoTecnicoBrl = custoApiBrl + custoInfraBrl;

    // Mão de obra: por número de WhatsApp ativo, conforme plano selecionado
    const custoMoBrl = calcularMaoDeObraPorNumero(quantidadeNumeros, moPlanoId);
    const custoMoLegadoBrl = quantidadeNumeros * MO_PRECO_LEGADO_POR_NUMERO;
    const moPorPlano: Record<MoPlanoId, number> = {
      basico:  calcularMaoDeObraPorNumero(quantidadeNumeros, "basico"),
      padrao:  calcularMaoDeObraPorNumero(quantidadeNumeros, "padrao"),
      premium: calcularMaoDeObraPorNumero(quantidadeNumeros, "premium"),
    };
    const pctMoNoTotal = calcularPercentualMaoDeObra(custoTecnicoBrl, custoMoBrl);

    const custoTotalMes = custoTecnicoBrl + custoMoBrl;
    const custoPrimeiroMes = custoTotalMes + setup;
    const venda = calcVenda(custoTotalMes, setup, 0.40);
    const custoPorNumero = quantidadeNumeros > 0 ? custoTotalMes / quantidadeNumeros : 0;

    return {
      audiosMes, minutosMes,
      eleven, playht, polly, gpt,
      audioUsd, audioLabel,
      custoAudioBrl, custoTextoBrl, custoInfraBrl, custoTecnicoBrl,
      custoApiUsd, custoApiBrl,
      custoMoBrl, custoMoLegadoBrl, moPorPlano, pctMoNoTotal, custoPorNumero,
      custoTotalMes, custoPrimeiroMes,
      ...venda,
    };
  }, [totalDisparos, pctAudio, duracaoSeg, quantidadeNumeros, moPlanoId, cambio, setup, ferramentaAudio, qualidade, modeloGpt, tokensPorMsg]);

  const planos = useMemo(() => calcPlanos(calc.precoVenda, setup), [calc.precoVenda, setup]);
  const anual = useMemo(() => calcAnual(calc.custoTotalMes, calc.precoVenda, setup), [calc.custoTotalMes, calc.precoVenda, setup]);

  // ===== Ramp-up (crescimento gradual) =====
  const [rampAtivo, setRampAtivo] = useState(false);
  const [rampMeses, setRampMeses] = useState(6);
  const [rampDisparosIni, setRampDisparosIni] = useState(1500);
  const [rampPctAudioIni, setRampPctAudioIni] = useState(10);
  const [rampNumerosIni, setRampNumerosIni] = useState(5);

  const rampData = useMemo<RampMes[]>(() => {
    if (!rampAtivo) return [];
    return calcRampUp({
      meses: rampMeses,
      disparosInicial: rampDisparosIni,
      disparosFinal: totalDisparos,
      pctAudioInicial: rampPctAudioIni,
      pctAudioFinal: pctAudio,
      duracaoSeg,
      tokensPorMsg,
      modeloGpt,
      ferramenta: ferramentaAudio === "comparar" ? "elevenlabs" : ferramentaAudio,
      numerosInicial: rampNumerosIni,
      numerosFinal: quantidadeNumeros,
      moPlanoId,
      cambio,
      setup,
    });
  }, [rampAtivo, rampMeses, rampDisparosIni, rampPctAudioIni, rampNumerosIni,
      totalDisparos, pctAudio, duracaoSeg, tokensPorMsg, modeloGpt,
      ferramentaAudio, quantidadeNumeros, moPlanoId, cambio, setup]);

  // ===== Gráfico de barras =====
  const chartData = useMemo(() => {
    const gptBrl = calc.gpt.totalUsd * cambio;
    return [
      { ferramenta: "ElevenLabs", audio: calc.eleven.totalUsd * cambio, texto: gptBrl, mo: calc.custoMoBrl },
      { ferramenta: "Play.ht",    audio: calc.playht.totalUsd * cambio, texto: gptBrl, mo: calc.custoMoBrl },
      { ferramenta: "Amazon Polly", audio: calc.polly.totalUsd * cambio, texto: gptBrl, mo: calc.custoMoBrl },
    ];
  }, [calc, cambio]);

  // ===== PieChart =====
  const pieData = useMemo(() => {
    const audio = calc.audioUsd * cambio;
    const texto = calc.gpt.totalUsd * cambio;
    const mo = calc.custoMoBrl;
    const total = audio + texto + mo;
    if (total === 0) return [];
    return [
      { name: "Áudio API", value: audio, pct: ((audio / total) * 100).toFixed(1), cor: CHART_COLORS.orange },
      { name: "Texto (GPT)", value: texto, pct: ((texto / total) * 100).toFixed(1), cor: CHART_COLORS.cyan },
      { name: "Mão de obra", value: mo, pct: ((mo / total) * 100).toFixed(1), cor: CHART_COLORS.purple },
    ];
  }, [calc, cambio]);

  // ===== Alertas =====
  const alertas: { tipo: "warn" | "info" | "danger"; texto: string }[] = [];
  if (calc.eleven.excedenteMin > 0 && calc.eleven.excedenteMin / calc.eleven.plano.minutosInclusos > 0.30) {
    alertas.push({ tipo: "warn", texto: "Excedente alto no ElevenLabs — considere subir de plano para reduzir custo." });
  }
  if (calc.custoMoBrl > calc.custoApiBrl) {
    alertas.push({ tipo: "info", texto: "Sua mão de obra é o maior custo — considere aumentar o preço de venda." });
  }
  if (calc.margemPct < 30) {
    alertas.push({ tipo: "danger", texto: `⚠ Margem atual de ${calc.margemPct.toFixed(1)}% está abaixo de 30% — considere aumentar o preço de venda.` });
  }
  if (calc.playht.totalUsd > 0 && calc.playht.totalUsd < calc.eleven.totalUsd * 0.3) {
    alertas.push({ tipo: "info", texto: "Play.ht está 3x+ mais barato neste volume — mas avalie a estabilidade da entrega." });
  }
  if (calc.eleven.plano.id === "business" && ferramentaAudio === "elevenlabs") {
    alertas.push({ tipo: "warn", texto: "📊 Volume alto detectado — você está no plano Business do ElevenLabs. Considere negociar um contrato enterprise." });
  }
  if (calc.gpt.totalUsd < 0.50 && calc.gpt.textosMes > 0) {
    alertas.push({ tipo: "info", texto: `💡 Custo do GPT é apenas ${fmtUSD(calc.gpt.totalUsd)}/mês — quase gratuito neste volume.` });
  }

  function aplicarCenario(c: Cenario) {
    setPctAudio(c.pctAudio);
  }

  // ===== Texto da proposta (compartilhado entre WhatsApp e PDF) =====
  function gerarTextoProposta(plano: typeof planos[0]) {
    const cliente = nomeCliente ? `*Cliente:* ${nomeCliente}\n` : "";
    return `🚀 *Proposta de Automação WhatsApp — MentoArk*
${cliente}
📦 *${plano.nome}${plano.destaque ? " ⭐" : ""}*
💰 *${fmtBRL(plano.preco)}/mês*
🔧 Setup: ${fmtBRL(plano.setup)} (único)

*Inclui:*
${plano.features.map(f => `✅ ${f}`).join("\n")}

📊 *Resumo técnico:*
• ${fmtNum(calc.audiosMes)} áudios/mês (${duracaoSeg}s cada)
• ${fmtNum(calc.gpt.textosMes)} mensagens de texto com IA
• Ferramenta: ${calc.audioLabel}
• Modelo GPT: ${GPT_PRICES[modeloGpt].label}

📅 *Financeiro:*
• 1º mês: ${fmtBRL(plano.preco + plano.setup)}
• A partir do 2º mês: ${fmtBRL(plano.preco)}
• Projeção anual: ${fmtBRL(plano.preco * 12 + plano.setup)}

🌐 mentoark.com.br`;
  }

  // ===== Copiar proposta (WhatsApp) =====
  function copiarProposta(plano: typeof planos[0]) {
    navigator.clipboard.writeText(gerarTextoProposta(plano)).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  }

  // ===== Baixar proposta como PDF =====
  function baixarPropostaPDF(plano: typeof planos[0]) {
    const texto = gerarTextoProposta(plano);
    // Remove asteriscos de negrito do markdown WhatsApp para o PDF
    const limpo = texto.replace(/\*/g, "");

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 18;
    const marginY = 20;
    const maxW = pageW - marginX * 2;

    // Cabeçalho
    doc.setFillColor(234, 90, 27); // laranja MentoArk
    doc.rect(0, 0, pageW, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("MentoArk · Proposta Comercial", marginX, 9);

    // Corpo
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const linhas = doc.splitTextToSize(limpo, maxW);
    let y = marginY + 4;
    const lineH = 5.5;

    for (const linha of linhas) {
      if (y > pageH - marginY) {
        doc.addPage();
        y = marginY;
      }
      doc.text(linha, marginX, y);
      y += lineH;
    }

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Gerado em ${new Date().toLocaleDateString("pt-BR")} · mentoark.com.br`,
      marginX,
      pageH - 10
    );

    const slug = (nomeCliente || "cliente").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const planoSlug = plano.nome.toLowerCase().replace(/\s+/g, "-");
    doc.save(`proposta-${slug}-${planoSlug}.pdf`);
  }


  // ===== Histórico =====
  function salvarSimulacao() {
    const item: SimulacaoSalva = {
      id: Date.now(),
      cliente: nomeCliente,
      disparos: totalDisparos,
      pctAudio,
      duracaoSeg,
      ferramenta: ferramentaAudio,
      modeloGpt,
      quantidadeNumeros,
      moPlanoId,
      cambio,
      setup,
      custoTotal: calc.custoTotalMes,
      precoVenda: calc.precoVenda,
      lucro: calc.lucroMes,
      data: new Date().toLocaleDateString("pt-BR"),
    };
    const novo = [item, ...historico].slice(0, 5);
    setHistorico(novo);
    if (typeof window !== "undefined") localStorage.setItem("tts_history", JSON.stringify(novo));
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }
  function carregarSimulacao(s: SimulacaoSalva) {
    setNomeCliente(s.cliente);
    setTotalDisparos(s.disparos);
    setPctAudio(s.pctAudio);
    setDuracaoSeg(s.duracaoSeg);
    setFerramentaAudio(s.ferramenta as AudioTool);
    setModeloGpt(s.modeloGpt as GptModel);
    setQuantidadeNumeros(s.quantidadeNumeros ?? 30);
    setMoPlanoId(s.moPlanoId ?? "padrao");
    setCambio(s.cambio);
    setSetup(s.setup);
  }
  function excluirSimulacao(id: number) {
    const novo = historico.filter(s => s.id !== id);
    setHistorico(novo);
    if (typeof window !== "undefined") localStorage.setItem("tts_history", JSON.stringify(novo));
  }

  function resetar() {
    setTotalDisparos(5000); setPctAudio(30); setDuracaoSeg(10);
    setQuantidadeNumeros(30); setMoPlanoId("padrao");
    setCambio(5.80); setSetup(4500);
    setFerramentaAudio("elevenlabs"); setModeloGpt("gpt4o-mini");
    setTokensPorMsg(200); setNomeCliente("");
  }

  function exportarPDF() {
    if (typeof document !== "undefined") {
      document.title = `Proposta TTS — ${nomeCliente || "Cliente"} — ${new Date().toLocaleDateString("pt-BR")}`;
      window.print();
    }
  }

  const moPlanoSel = MO_PLANOS[moPlanoId];
  const breakdown = [
    { item: `${calc.audioLabel} · áudio`, usd: calc.audioUsd, brl: calc.audioUsd * cambio },
    { item: `${GPT_PRICES[modeloGpt].label} · texto`, usd: calc.gpt.totalUsd, brl: calc.custoTextoBrl },
    { item: "n8n (self-hosted)", usd: 0, brl: 0 },
    { item: `Mão de obra · ${moPlanoSel.nome} (${quantidadeNumeros} números × ${fmtBRL(moPlanoSel.precoPorNumero)})`, usd: null as number | null, brl: calc.custoMoBrl },
  ];
  const subtotalApiBrl = calc.custoApiBrl;
  const textosMes = totalDisparos * (1 - pctAudio / 100);

  return (
    <div className={`tts-app tts-grid-bg ${tema === "light" ? "tts-light" : ""}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-10">

        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 border-b border-[var(--tts-border)] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalcIcon className="size-5 text-[var(--tts-orange)]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--tts-orange)]">
                MentoArk · Pricing engine v2.0
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight">
              TTS Cost{" "}
              <span style={{
                background: "var(--tts-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>Calculator</span>
            </h1>
            <p className="text-sm text-[var(--tts-muted)] mt-2 max-w-xl">
              Calcule custos de API, infraestrutura e mão de obra para soluções de disparo
              com áudio e texto via WhatsApp. Recálculo em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Mini summary */}
            <div className="flex items-center gap-3 px-4 py-2 tts-card-elevated">
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-[var(--tts-muted)] font-mono">Custo/mês</p>
                <p className="font-mono text-sm font-bold">{fmtBRL(calc.custoTotalMes)}</p>
              </div>
              <div className="w-px h-8 bg-[var(--tts-border)]" />
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-[var(--tts-muted)] font-mono">Venda</p>
                <p className="font-mono text-sm font-bold" style={{ color: "var(--tts-orange)" }}>{fmtBRL(calc.precoVenda)}</p>
              </div>
              <div className="w-px h-8 bg-[var(--tts-border)]" />
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-[var(--tts-muted)] font-mono">Margem</p>
                <p className="font-mono text-sm font-bold" style={{
                  color: calc.margemPct >= 35 ? "var(--tts-green)" : calc.margemPct >= 25 ? "var(--tts-gold)" : "var(--tts-red)",
                }}>
                  {calc.margemPct.toFixed(1)}%
                </p>
              </div>
            </div>

            <button onClick={toggleTema} className="tts-btn !text-xs" title="Alternar tema">
              {tema === "dark" ? <Sun className="size-3" /> : <Moon className="size-3" />}
            </button>
            <button onClick={resetar} className="tts-btn !text-xs" title="Resetar para valores padrão">
              <RotateCcw className="size-3" /> Reset
            </button>
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
          <div className="tts-card p-6 space-y-6 lg:col-span-2">
            <SectionTitle icon={<Wrench className="size-4" />} title="Configuração base" />

            {/* Nome do cliente */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-[var(--tts-muted)] font-mono">
                Nome do cliente
              </label>
              <input
                type="text"
                className="tts-input"
                placeholder="Ex: Acme Corp"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <SliderInput label="Disparos / mês"     value={totalDisparos} onChange={setTotalDisparos} min={1000} max={500000} step={500} />
              <SliderInput
                label="% Áudio"
                value={pctAudio}
                onChange={setPctAudio}
                min={0} max={100} suffix="%"
                hint={`Texto: ${100 - pctAudio}% · ${fmtNum(textosMes)} msgs`}
              />
              <SliderInput label="Duração / áudio"    value={duracaoSeg}    onChange={setDuracaoSeg}    min={5} max={120} suffix="s" />
              <SliderInput label="Tokens / msg texto" value={tokensPorMsg}  onChange={setTokensPorMsg}  min={50} max={2000} step={10} />
              <SliderInput
                label="Números WhatsApp ativos"
                value={quantidadeNumeros}
                onChange={setQuantidadeNumeros}
                min={1} max={200} step={1}
                hint={`MO ${moPlanoSel.nome}: ${fmtBRL(calc.custoMoBrl)}/mês (${pctNumber(calc.pctMoNoTotal)}% do total)`}
              />
              <NumberField label="Câmbio USD → BRL" value={cambio} onChange={setCambio} step={0.05} prefix="R$" />
              <NumberField label="Setup (one-time)" value={setup}  onChange={setSetup}  step={100} prefix="R$" />
            </div>
          </div>

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
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[var(--tts-muted)] font-mono">Plano ótimo:</span>
                  <span className="font-mono text-xs">{calc.eleven.plano.nome} · ${calc.eleven.plano.fixoUsd}/mês</span>
                  <span className={`tts-badge tts-badge-${calc.eleven.status === "ok" ? "ok" : calc.eleven.status === "warn" ? "warn" : "danger"}`}>
                    {calc.eleven.status === "ok" ? "Sem excedente"
                      : calc.eleven.status === "warn" ? `Exc. ${fmtNum(calc.eleven.excedenteMin)}min`
                      : `Exc. ${fmtNum(calc.eleven.excedenteMin)}min ⚠`}
                  </span>
                </div>
              )}
            </div>

            {/* Qualidade de áudio */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-2">Qualidade de áudio</div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: "good" as AudioQuality,         label: "Bom",          hint: "WhatsApp · 128 kbps" },
                  { id: "professional" as AudioQuality, label: "Profissional", hint: "192 kbps · cloning" },
                  { id: "studio" as AudioQuality,       label: "Estúdio",      hint: "44.1kHz PCM" },
                ]).map(q => (
                  <button
                    key={q.id}
                    onClick={() => setQualidade(q.id)}
                    className={`tts-btn !text-xs flex-col !items-start !py-2 ${qualidade === q.id ? "tts-btn-active" : ""}`}
                    title={q.hint}
                  >
                    <span>{q.label}</span>
                    <span className="text-[9px] text-[var(--tts-muted)] font-mono normal-case">{q.hint}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--tts-muted)] font-mono mt-2">
                Plano recomendado considera apenas planos compatíveis com a qualidade selecionada.
              </p>
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

        {/* Resultados */}
        <section>
          <SectionTitle icon={<TrendingUp className="size-4" />} title="Resultados" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Custo API / mês" value={fmtBRL(calc.custoApiBrl)} sub={fmtUSD(calc.custoApiUsd)} accent="cyan" />
            <StatCard label="Mão de obra / mês" value={fmtBRL(calc.custoMoBrl)} sub={`${pctMo}% de ${fmtBRL(moBase)}`} />
            <StatCard label="Custo total / mês" value={fmtBRL(calc.custoTotalMes)} accent="orange" large />
            <StatCard label="Custo / disparo" value={totalDisparos > 0 ? fmtBRL(calc.custoTotalMes / totalDisparos) : "R$ 0,00"} sub="custo total ÷ disparos" accent="cyan" />
            <StatCard label="1º mês (com setup)" value={fmtBRL(calc.custoPrimeiroMes)} sub={`+ ${fmtBRL(setup)} setup`} accent="gold" />
            <StatCard label="Preço de venda" value={fmtBRL(calc.precoVenda)} sub="margem 40%" accent="green" large />
            <StatCard label="Lucro / mês" value={fmtBRL(calc.lucroMes)} sub={`${calc.margemPct.toFixed(1)}% de margem`} accent="green" />
            <StatCard label="LTV 24 meses" value={fmtBRL(calc.precoVenda * 24 + setup)} sub={`Anual: ${fmtBRL(calc.faturamentoAnual)}`} accent="cyan" />
          </div>
        </section>

        {/* Áudio ElevenLabs — seção dedicada */}
        {ferramentaAudio === "elevenlabs" && (
          <section>
            <SectionTitle
              icon={<Mic className="size-4" />}
              title="Áudio ElevenLabs"
              hint={`Qualidade: ${qualidade === "good" ? "Bom" : qualidade === "professional" ? "Profissional" : "Estúdio"}`}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Card do plano recomendado */}
              <div className="tts-card p-5 lg:col-span-1 !border-[var(--tts-orange)]">
                <p className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-1">
                  Plano recomendado
                </p>
                <h3 className="font-display text-2xl font-bold">{calc.eleven.plano.nome}</h3>
                <p className="text-xs text-[var(--tts-muted)] font-mono mb-3">
                  {calc.eleven.plano.qualidadeLabel}
                </p>
                <div className="font-mono text-3xl font-bold" style={{ color: "var(--tts-orange)" }}>
                  {fmtUSD(calc.eleven.totalUsd)}
                  <span className="text-xs text-[var(--tts-muted)] font-normal">/mês</span>
                </div>
                <p className="text-xs text-[var(--tts-muted)] font-mono mt-1">
                  ≈ {fmtBRL(calc.eleven.totalUsd * cambio)} (câmbio {cambio.toFixed(2)})
                </p>

                <div className="mt-4 space-y-1.5 text-xs font-mono">
                  <Row k="Plano base"          v={`${fmtUSD(calc.eleven.plano.fixoUsd)}/mês`} />
                  <Row k="Minutos inclusos"    v={`${fmtNum(calc.eleven.minutosInclusos)} min`} />
                  <Row k="Minutos necessários" v={`${fmtNum(calc.eleven.minutosNecessarios, 1)} min`} />
                  <Row k="Excedente"           v={`${fmtNum(calc.eleven.excedenteMin, 1)} min`} />
                  <Row k="Custo excedente"     v={fmtUSD(calc.eleven.excedenteUsd)} />
                  <div className="border-t border-[var(--tts-border)] pt-1.5 mt-1.5 flex justify-between font-bold">
                    <span>Total ElevenLabs</span>
                    <span style={{ color: "var(--tts-orange)" }}>{fmtUSD(calc.eleven.totalUsd)}/mês</span>
                  </div>
                </div>
              </div>

              {/* Comparativo entre planos elegíveis */}
              <div className="tts-card p-5 lg:col-span-2 overflow-hidden">
                <p className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">
                  Comparativo de planos · qualidade compatível
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] border-b border-[var(--tts-border)]">
                        <th className="text-left p-2">Plano</th>
                        <th className="text-right p-2">Fixo</th>
                        <th className="text-right p-2">Inclusos</th>
                        <th className="text-right p-2">Excedente</th>
                        <th className="text-right p-2">Custo exc.</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calc.eleven.comparativo.map(r => {
                        const isReco = r.plano.id === calc.eleven.plano.id;
                        return (
                          <tr
                            key={r.plano.id}
                            className={`border-b border-[var(--tts-border)]/60 ${isReco ? "bg-[var(--tts-surface-2)]" : ""}`}
                          >
                            <td className="p-2">
                              <span className={isReco ? "font-bold text-[var(--tts-orange)]" : ""}>
                                {r.plano.nome}
                              </span>
                              {isReco && <span className="ml-1 text-[9px]">★</span>}
                            </td>
                            <td className="p-2 text-right">{fmtUSD(r.plano.fixoUsd)}</td>
                            <td className="p-2 text-right">{fmtNum(r.minutosInclusos)} min</td>
                            <td className="p-2 text-right">
                              {r.excedenteMin > 0
                                ? <span className="text-[var(--tts-gold)]">{fmtNum(r.excedenteMin, 1)} min</span>
                                : <span className="text-[var(--tts-green)]">—</span>}
                            </td>
                            <td className="p-2 text-right">{fmtUSD(r.excedenteUsd)}</td>
                            <td className="p-2 text-right font-bold">{fmtUSD(r.totalUsd)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-[var(--tts-muted)] font-mono mt-3">
                  Recomendado = plano mais barato que cobre o volume sem excedente.
                  Se nenhum cobre, é escolhido o de menor custo total (fixo + excedente).
                </p>
              </div>
            </div>
          </section>
        )}

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

        {/* Gráficos: Bar + Pie */}
        <section>
          <SectionTitle icon={<TrendingUp className="size-4" />} title="Comparativo de ferramentas" hint="Volume atual em BRL" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="tts-card p-4 md:p-6 lg:col-span-2">
              <div className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">
                Custo total por ferramenta (empilhado)
              </div>
              <div style={{ width: "100%", height: 340 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" />
                    <XAxis dataKey="ferramenta" stroke="#4f617a" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis stroke="#4f617a" tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickFormatter={(v) => "R$" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0))} />
                    <Tooltip
                      contentStyle={{ background: "#0d1119", border: "1px solid #1a2235", borderRadius: 8, fontSize: 12, color: "#d8e4f5" }}
                      formatter={(v: number) => fmtBRL(v)}
                      cursor={{ fill: "rgba(255,107,43,0.05)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="audio" stackId="a" fill={CHART_COLORS.orange} name="Áudio" />
                    <Bar dataKey="texto" stackId="a" fill={CHART_COLORS.cyan} name="Texto (GPT)" />
                    <Bar dataKey="mo" stackId="a" fill={CHART_COLORS.purple} name="Mão de obra" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="tts-card p-4 md:p-6">
              <div className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">
                Composição do custo atual
              </div>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0d1119", border: "1px solid #1a2235", borderRadius: 8, fontSize: 12, color: "#d8e4f5" }}
                      formatter={(v: number, name: string) => [fmtBRL(v), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: d.cor }} />
                      <span>{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{fmtBRL(d.value)}</span>
                      <span className="text-[var(--tts-muted)]">{d.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Proposta */}
        <section className="tts-print-section">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <SectionTitle icon={<Sparkles className="size-4" />} title={nomeCliente ? `Proposta para ${nomeCliente}` : "Proposta para o cliente"} />
            <div className="flex gap-2">
              <button onClick={salvarSimulacao} className="tts-btn !text-xs">
                {salvo ? <><Check className="size-3" /> Salvo!</> : <><Save className="size-3" /> Salvar</>}
              </button>
              <button onClick={exportarPDF} className="tts-btn !text-xs">
                <Printer className="size-3" /> Exportar PDF
              </button>
              <button onClick={() => copiarProposta(planos[1])} className="tts-btn !text-xs">
                {copiado ? <><Check className="size-3" /> Copiado!</> : <><Copy className="size-3" /> Copiar Plano Pro</>}
              </button>
            </div>
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
                {nomeCliente && (
                  <p className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-1">
                    Para: <span className="text-[var(--tts-text)]">{nomeCliente}</span>
                  </p>
                )}
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
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button onClick={() => copiarProposta(p)} className="tts-btn !text-xs">
                    <Copy className="size-3" /> WhatsApp
                  </button>
                  <button onClick={() => baixarPropostaPDF(p)} className="tts-btn !text-xs">
                    <FileDown className="size-3" /> PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Histórico */}
        {historico.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <SectionTitle icon={<Clock className="size-4" />} title="Histórico de simulações" />
              <button onClick={() => setMostrarHistorico(v => !v)} className="tts-btn !text-xs">
                {mostrarHistorico ? "Ocultar" : `Ver ${historico.length} simulações`}
              </button>
            </div>
            {mostrarHistorico && (
              <div className="tts-card overflow-x-auto tts-fade-in">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] border-b border-[var(--tts-border)]">
                      <th className="text-left p-3">Data</th>
                      <th className="text-left p-3">Cliente</th>
                      <th className="text-right p-3">Disparos</th>
                      <th className="text-right p-3">Custo</th>
                      <th className="text-right p-3">Venda</th>
                      <th className="text-right p-3">Lucro</th>
                      <th className="text-right p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map(s => (
                      <tr key={s.id} className="border-b border-[var(--tts-border)]/60">
                        <td className="p-3">{s.data}</td>
                        <td className="p-3">{s.cliente || <span className="text-[var(--tts-muted)]">—</span>}</td>
                        <td className="p-3 text-right">{fmtNum(s.disparos)}</td>
                        <td className="p-3 text-right">{fmtBRL(s.custoTotal)}</td>
                        <td className="p-3 text-right">{fmtBRL(s.precoVenda)}</td>
                        <td className="p-3 text-right" style={{ color: "var(--tts-green)" }}>{fmtBRL(s.lucro)}</td>
                        <td className="p-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => carregarSimulacao(s)}
                              className="tts-btn !text-[10px] !px-2 !py-1"
                            >Carregar</button>
                            <button
                              onClick={() => excluirSimulacao(s.id)}
                              className="tts-btn !text-[10px] !px-2 !py-1 hover:!border-[var(--tts-red)] hover:!text-[var(--tts-red)]"
                            >🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Ramp-up: crescimento gradual */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <SectionTitle
              icon={<TrendingUp className="size-4" />}
              title="Crescimento gradual (ramp-up)"
              hint="Volume e MO crescem mês a mês até a meta"
            />
            <button onClick={() => setRampAtivo(v => !v)} className="tts-btn !text-xs">
              {rampAtivo ? "Desativar" : "Ativar"} ramp-up
            </button>
          </div>

          {rampAtivo && (
            <div className="space-y-6 tts-fade-in">
              <div className="tts-card p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
                <SliderInput
                  label="Duração do ramp"
                  value={rampMeses}
                  onChange={setRampMeses}
                  min={2} max={12} suffix="meses"
                />
                <SliderInput
                  label="Disparos no mês 1"
                  value={rampDisparosIni}
                  onChange={setRampDisparosIni}
                  min={500} max={Math.max(500, totalDisparos)} step={500}
                  hint={`Meta no mês ${rampMeses}: ${fmtNum(totalDisparos)}`}
                />
                <SliderInput
                  label="% Áudio no mês 1"
                  value={rampPctAudioIni}
                  onChange={setRampPctAudioIni}
                  min={0} max={100} suffix="%"
                  hint={`Meta: ${pctAudio}%`}
                />
                <SliderInput
                  label="% MO no mês 1"
                  value={rampPctMoIni}
                  onChange={setRampPctMoIni}
                  min={0} max={100} suffix="%"
                  hint={`Meta: ${pctMo}% · = ${fmtBRL(moBase * rampPctMoIni / 100)}`}
                />
              </div>

              {/* Botões de preset proporcional 1/N da meta */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mr-1">
                  Mês 1 = 1/N da meta:
                </span>
                {[2, 3, 4, 6, 12].map(n => (
                  <button
                    key={n}
                    onClick={() => {
                      setRampMeses(n);
                      setRampDisparosIni(Math.max(500, Math.round(totalDisparos / n / 500) * 500));
                      setRampPctAudioIni(Math.round(pctAudio / n));
                      setRampPctMoIni(Math.round(pctMo / n));
                    }}
                    className="tts-btn !text-xs !py-1 !px-3"
                    title={`Começa com 1/${n} do volume final e cresce em ${n} meses`}
                  >
                    1/{n} ({n}m)
                  </button>
                ))}
                <button
                  onClick={() => {
                    setRampDisparosIni(totalDisparos);
                    setRampPctAudioIni(pctAudio);
                    setRampPctMoIni(pctMo);
                  }}
                  className="tts-btn !text-xs !py-1 !px-3"
                  title="Inicia já no volume final (sem ramp)"
                >
                  100% (sem ramp)
                </button>
              </div>

              {rampData.length > 0 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      label="Receita acumulada"
                      value={fmtBRL(rampData[rampData.length - 1].receitaAcum)}
                      sub={`em ${rampMeses} meses`}
                      accent="green"
                    />
                    <StatCard
                      label="Custo acumulado"
                      value={fmtBRL(rampData[rampData.length - 1].custoAcum)}
                      sub={`inclui ${fmtBRL(setup)} setup`}
                      accent="cyan"
                    />
                    <StatCard
                      label="Lucro acumulado"
                      value={fmtBRL(rampData[rampData.length - 1].lucroAcum)}
                      sub="do ramp-up"
                      accent="orange"
                      large
                    />
                    <StatCard
                      label="Mês de venda final"
                      value={fmtBRL(rampData[rampData.length - 1].precoVenda)}
                      sub={`vs mês 1: ${fmtBRL(rampData[0].precoVenda)}`}
                      accent="gold"
                    />
                  </div>

                  <div className="tts-card p-4 md:p-6">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">
                      Evolução mensal — receita, custo e lucro
                    </div>
                    <div style={{ width: "100%", height: 300 }}>
                      <ResponsiveContainer>
                        <BarChart data={rampData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" />
                          <XAxis dataKey="mes" stroke="#4f617a" tick={{ fill: "#94a3b8", fontSize: 12 }}
                            tickFormatter={(v) => `M${v}`} />
                          <YAxis stroke="#4f617a" tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickFormatter={(v) => "R$" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0))} />
                          <Tooltip
                            contentStyle={{ background: "#0d1119", border: "1px solid #1a2235", borderRadius: 8, fontSize: 12, color: "#d8e4f5" }}
                            formatter={(v: number) => fmtBRL(v)}
                            labelFormatter={(l) => `Mês ${l}`}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="custoTotal" fill={CHART_COLORS.purple} name="Custo" />
                          <Bar dataKey="receita" fill={CHART_COLORS.cyan} name="Receita" />
                          <Bar dataKey="lucro" fill={CHART_COLORS.orange} name="Lucro" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>


                  {/* Gráfico: crescimento proporcional de áudio, texto e MO */}
                  <div className="tts-card p-4 md:p-6">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">
                      Crescimento proporcional — áudio, texto e mão de obra
                    </div>
                    <div style={{ width: "100%", height: 300 }}>
                      <ResponsiveContainer>
                        <LineChart
                          data={rampData.map(m => ({
                            mes: m.mes,
                            audios: Math.round(m.audiosMes),
                            textos: Math.round(m.disparos - m.audiosMes),
                            moPct: Math.round(m.pctMo),
                          }))}
                          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" />
                          <XAxis dataKey="mes" stroke="#4f617a" tick={{ fill: "#94a3b8", fontSize: 12 }}
                            tickFormatter={(v) => `M${v}`} />
                          <YAxis yAxisId="left" stroke="#4f617a" tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)} />
                          <YAxis yAxisId="right" orientation="right" stroke="#4f617a"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{ background: "#0d1119", border: "1px solid #1a2235", borderRadius: 8, fontSize: 12, color: "#d8e4f5" }}
                            labelFormatter={(l) => `Mês ${l}`}
                            formatter={(v, name) =>
                              name === "MO (% base)" ? `${v}%` : fmtNum(Number(v))
                            }
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line yAxisId="left" type="monotone" dataKey="audios" stroke={CHART_COLORS.purple}
                            strokeWidth={2} dot={{ r: 3 }} name="Áudios/mês" />
                          <Line yAxisId="left" type="monotone" dataKey="textos" stroke={CHART_COLORS.cyan}
                            strokeWidth={2} dot={{ r: 3 }} name="Textos/mês" />
                          <Line yAxisId="right" type="monotone" dataKey="moPct" stroke={CHART_COLORS.orange}
                            strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="MO (% base)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="tts-card overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] border-b border-[var(--tts-border)]">
                          <th className="text-left p-3">Mês</th>
                          <th className="text-right p-3">Disparos</th>
                          <th className="text-right p-3">% Áudio</th>
                          <th className="text-right p-3">MO</th>
                          <th className="text-right p-3">Custo</th>
                          <th className="text-right p-3">Venda</th>
                          <th className="text-right p-3">Lucro</th>
                          <th className="text-right p-3">Lucro acum.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rampData.map(m => (
                          <tr key={m.mes} className="border-b border-[var(--tts-border)]/60">
                            <td className="p-3">
                              Mês {m.mes}
                              {m.mes === 1 && <span className="ml-2 tts-badge tts-badge-warn">Setup</span>}
                              {m.mes === rampMeses && <span className="ml-2 tts-badge tts-badge-orange">Meta</span>}
                            </td>
                            <td className="p-3 text-right">{fmtNum(m.disparos)}</td>
                            <td className="p-3 text-right">{m.pctAudio.toFixed(0)}%</td>
                            <td className="p-3 text-right">{fmtBRL(m.custoMoBrl)} <span className="text-[var(--tts-muted)]">({m.pctMo.toFixed(0)}%)</span></td>
                            <td className="p-3 text-right">{fmtBRL(m.custoTotal)}</td>
                            <td className="p-3 text-right">{fmtBRL(m.precoVenda)}</td>
                            <td className="p-3 text-right" style={{ color: "var(--tts-green)" }}>{fmtBRL(m.lucro)}</td>
                            <td className="p-3 text-right" style={{ color: "var(--tts-green)" }}>{fmtBRL(m.lucroAcum)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
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
          TTS Cost Calculator · MentoArk · cálculo client-side · valores referenciais sujeitos a alteração de preços nas APIs
        </footer>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-[var(--tts-muted)]">
      <span>{k}</span>
      <span className="text-[var(--tts-text)]">{v}</span>
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

function NumberField({ label, value, onChange, step = 1, prefix, suffix }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-wider text-[var(--tts-muted)] font-mono">{label}</label>
      <div className="flex items-center gap-2">
        {prefix && <span className="text-xs text-[var(--tts-muted)] font-mono">{prefix}</span>}
        <input
          type="number"
          className="tts-input"
          value={value}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v) && v >= 0) onChange(v);
          }}
        />
        {suffix && <span className="text-xs text-[var(--tts-muted)] font-mono">{suffix}</span>}
      </div>
    </div>
  );
}
