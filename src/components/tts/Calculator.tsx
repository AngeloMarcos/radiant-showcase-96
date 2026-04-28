import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  calcMinutos, calcElevenLabs, calcPlayht, calcPolly, calcGpt, calcVenda,
  calcPlanos, calcAnual, calcRampUp, calcEscalaPorNumero, calcSensibilidadePorNumero,
  calcCondicaoCampanha, calcCenariosCampanha,
  GPT_PRICES, fmtBRL, fmtUSD, fmtNum,
  calcularMaoDeObraPorNumero, calcularPercentualMaoDeObra,
  aplicarPisoMargem, MARGEM_MINIMA_OBRIGATORIA, MARGEM_PADRAO,
  MO_PLANOS, MO_PRECO_LEGADO_POR_NUMERO,
  type GptModel, type RampMes, type AudioQuality, type MoPlanoId, type PlanoTier,
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
  RotateCcw, Save, Clock, Printer, FileDown, Presentation,
  CalendarClock, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { PresentationMode } from "./PresentationMode";

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
  const [moCustomAtivo, setMoCustomAtivo] = useState(false);
  const [moPrecoCustom, setMoPrecoCustom] = useState(220); // R$/número customizado
  const [cambio, setCambio] = useState(5.80);
  const [setup, setSetup] = useState(4500);
  const [ferramentaAudio, setFerramentaAudio] = useState<AudioTool>("elevenlabs");
  const [qualidade, setQualidade] = useState<AudioQuality>("good");
  const [modeloGpt, setModeloGpt] = useState<GptModel>("gpt4o-mini");
  const [tokensPorMsg, setTokensPorMsg] = useState(200);
  const [mostrarAnual, setMostrarAnual] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // ===== Modo de escala (proporcional por número) =====
  const [modoEscala, setModoEscala] = useState<"manual" | "porNumero">("manual");
  const [disparosPorNumero, setDisparosPorNumero] = useState(500);
  const [audiosPorNumero, setAudiosPorNumero] = useState(150);
  const [custoInfraPorNumero, setCustoInfraPorNumero] = useState(0);

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
  const [apresentacaoAberta, setApresentacaoAberta] = useState(false);

  // ===== Modo Campanha (pagamento diferido da MO) =====
  const [modoCampanha, setModoCampanha] = useState(false);
  const [pctEntradaMO, setPctEntradaMO] = useState(50);
  const [reservaMinima, setReservaMinima] = useState(0);
  const [presetCampanha, setPresetCampanha] = useState<"30/70" | "40/60" | "50/50" | "60/40" | "custom">("50/50");

  // ===== Escala por número (modo proporcional) =====
  // Quando ativo, disparos/pctAudio/infra são DERIVADOS da qtd de números.
  const escala = useMemo(() => calcEscalaPorNumero({
    quantidadeNumeros,
    disparosPorNumero,
    audiosPorNumero,
    duracaoMediaSeg: duracaoSeg,
    tokensPorMsg,
    custoInfraPorNumero,
  }), [quantidadeNumeros, disparosPorNumero, audiosPorNumero, duracaoSeg, tokensPorMsg, custoInfraPorNumero]);

  // Valores efetivamente usados no cálculo (variam conforme o modo).
  const disparosEfetivos = modoEscala === "porNumero" ? escala.disparosTotais : totalDisparos;
  const pctAudioEfetivo  = modoEscala === "porNumero" ? escala.pctAudioDerivado : pctAudio;
  const infraBrlEfetivo  = modoEscala === "porNumero" ? escala.custoInfraTotalBrl : 0;

  // ===== Cálculos memorizados =====
  const calc = useMemo(() => {
    const { audiosMes, minutosMes } = calcMinutos(disparosEfetivos, pctAudioEfetivo, duracaoSeg);
    const eleven = calcElevenLabs(minutosMes, qualidade);
    const playht = calcPlayht(minutosMes);
    const polly = calcPolly(minutosMes);
    const gpt = calcGpt(disparosEfetivos, pctAudioEfetivo, tokensPorMsg, modeloGpt);

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
    const custoInfraBrl = infraBrlEfetivo;
    const custoTecnicoBrl = custoApiBrl + custoInfraBrl;

    // Mão de obra: por número de WhatsApp ativo, conforme plano selecionado
    const moOverride = moCustomAtivo ? moPrecoCustom : undefined;
    const custoMoBrl = calcularMaoDeObraPorNumero(quantidadeNumeros, moPlanoId, moOverride);
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
    const custoPorDisparo = disparosEfetivos > 0 ? custoTotalMes / disparosEfetivos : 0;

    return {
      audiosMes, minutosMes,
      eleven, playht, polly, gpt,
      audioUsd, audioLabel,
      custoAudioBrl, custoTextoBrl, custoInfraBrl, custoTecnicoBrl,
      custoApiUsd, custoApiBrl,
      custoMoBrl, custoMoLegadoBrl, moPorPlano, pctMoNoTotal, custoPorNumero, custoPorDisparo,
      custoTotalMes, custoPrimeiroMes,
      ...venda,
    };
  }, [disparosEfetivos, pctAudioEfetivo, duracaoSeg, quantidadeNumeros, moPlanoId, moCustomAtivo, moPrecoCustom, cambio, setup, ferramentaAudio, qualidade, modeloGpt, tokensPorMsg, infraBrlEfetivo]);

  // Planos comerciais (Essencial / Profissional / Premium) — calculados a partir
  // do CUSTO TOTAL (não do preço sugerido), com margens e capacidades distintas.
  const planos = useMemo(
    () => calcPlanos(calc.custoTotalMes, setup, disparosEfetivos),
    [calc.custoTotalMes, setup, disparosEfetivos]
  );
  const planoRecomendado = planos.find(p => p.destaque) ?? planos[1];
  const anual = useMemo(() => calcAnual(calc.custoTotalMes, calc.precoVenda, setup), [calc.custoTotalMes, calc.precoVenda, setup]);

  // ===== Sensibilidade por quantidade de números =====
  const sensibilidade = useMemo(() => calcSensibilidadePorNumero({
    quantidadesNumeros: [10, 30, 50, 100],
    disparosPorNumero,
    audiosPorNumero,
    duracaoSeg,
    tokensPorMsg,
    modeloGpt,
    qualidade,
    custoInfraPorNumero,
    moPlanoId,
    moPrecoOverride: moCustomAtivo ? moPrecoCustom : undefined,
    cambio,
    setup,
    margem: MARGEM_PADRAO,
  }), [disparosPorNumero, audiosPorNumero, duracaoSeg, tokensPorMsg, modeloGpt, qualidade, custoInfraPorNumero, moPlanoId, moCustomAtivo, moPrecoCustom, cambio, setup]);

  // Margem mínima — alerta visual.
  const margemAbaixoMinima = calc.margemPct / 100 < MARGEM_MINIMA_OBRIGATORIA;
  const precoMinimoSeguro = aplicarPisoMargem(calc.custoTotalMes, calc.precoVenda);

  // ===== Condição de campanha (pagamento diferido da MO) =====
  const campanha = useMemo(() => calcCondicaoCampanha({
    custoTecnicoBrl: calc.custoTecnicoBrl,
    maoDeObraBrl: calc.custoMoBrl,
    precoVenda: planoRecomendado.preco, // ancora no plano recomendado
    pctEntradaMO,
    reservaMinima,
  }), [calc.custoTecnicoBrl, calc.custoMoBrl, planoRecomendado.preco, pctEntradaMO, reservaMinima]);

  const cenariosCampanha = useMemo(() => calcCenariosCampanha({
    custoTecnicoBrl: calc.custoTecnicoBrl,
    maoDeObraBrl: calc.custoMoBrl,
    precoVenda: planoRecomendado.preco,
    reservaMinima,
  }), [calc.custoTecnicoBrl, calc.custoMoBrl, planoRecomendado.preco, reservaMinima]);

  // ===== Ramp-up (crescimento gradual) =====
  const [rampAtivo, setRampAtivo] = useState(false);
  const [rampMeses, setRampMeses] = useState(6);
  const [rampDisparosIni, setRampDisparosIni] = useState(1500);
  const [rampPctAudioIni, setRampPctAudioIni] = useState(10);
  const [rampNumerosIni, setRampNumerosIni] = useState(5);
  const [rampPreset, setRampPreset] = useState<number | "full" | null>(null);

  const rampData = useMemo<RampMes[]>(() => {
    if (!rampAtivo) return [];
    return calcRampUp({
      meses: rampMeses,
      disparosInicial: rampDisparosIni,
      disparosFinal: disparosEfetivos,
      pctAudioInicial: rampPctAudioIni,
      pctAudioFinal: pctAudioEfetivo,
      duracaoSeg,
      tokensPorMsg,
      modeloGpt,
      ferramenta: ferramentaAudio === "comparar" ? "elevenlabs" : ferramentaAudio,
      numerosInicial: rampNumerosIni,
      numerosFinal: quantidadeNumeros,
      moPlanoId,
      moPrecoOverride: moCustomAtivo ? moPrecoCustom : undefined,
      cambio,
      setup,
    });
  }, [rampAtivo, rampMeses, rampDisparosIni, rampPctAudioIni, rampNumerosIni,
      disparosEfetivos, pctAudioEfetivo, duracaoSeg, tokensPorMsg, modeloGpt,
      ferramentaAudio, quantidadeNumeros, moPlanoId, moCustomAtivo, moPrecoCustom, cambio, setup]);

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
  if (margemAbaixoMinima) {
    alertas.push({
      tipo: "danger",
      texto: `🚨 PROTEJA SUA MARGEM: atual ${calc.margemPct.toFixed(1)}% — abaixo do mínimo obrigatório de ${(MARGEM_MINIMA_OBRIGATORIA * 100).toFixed(0)}%. Preço mínimo seguro: ${fmtBRL(precoMinimoSeguro)}.`,
    });
  } else if (calc.margemPct < 40) {
    alertas.push({ tipo: "warn", texto: `Margem de ${calc.margemPct.toFixed(1)}% está abaixo do alvo de 40%. Considere reposicionar para o plano Profissional (${fmtBRL(planoRecomendado.preco)}).` });
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
  const textosMes = disparosEfetivos * (1 - pctAudioEfetivo / 100);

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

            <button onClick={() => setApresentacaoAberta(true)} className="tts-btn-primary !text-xs" title="Modo apresentação para o cliente">
              <Presentation className="size-3" /> Apresentar
            </button>
            <button onClick={toggleTema} className="tts-btn !text-xs" title="Alternar tema">
              {tema === "dark" ? <Sun className="size-3" /> : <Moon className="size-3" />}
            </button>
            <button onClick={resetar} className="tts-btn !text-xs" title="Resetar para valores padrão">
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>
        </header>

        {/* ===== DASHBOARD EXECUTIVO (estilo Power BI) ===== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <SectionTitle
              icon={<TrendingUp className="size-4" />}
              title="Painel executivo"
              hint="Visão consolidada da proposta — atualiza em tempo real"
            />
            <span className="tts-badge tts-badge-orange">Plano recomendado: {planoRecomendado.nome}</span>
          </div>

          {/* KPIs principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Tecnologia e consumo", value: fmtBRL(calc.custoTecnicoBrl), hint: "APIs + infraestrutura", color: "var(--tts-cyan)" },
              { label: "Operação e inteligência", value: fmtBRL(calc.custoMoBrl), hint: `${quantidadeNumeros} números · ${MO_PLANOS[moPlanoId].nome}`, color: "var(--tts-orange)" },
              { label: "Investimento total", value: fmtBRL(planoRecomendado.preco), hint: `+ ${fmtBRL(planoRecomendado.setup)} setup`, color: "var(--tts-text)" },
              { label: "Lucro estimado", value: fmtBRL(planoRecomendado.lucroMes), hint: `Margem ${(planoRecomendado.margemReal * 100).toFixed(0)}%`, color: "var(--tts-green)" },
              { label: "Pago AGORA", value: modoCampanha ? fmtBRL(campanha.valorPagoAgora) : fmtBRL(planoRecomendado.preco), hint: modoCampanha ? `${campanha.percentualPagoAgora.toFixed(0)}% do total` : "Pagamento integral", color: "var(--tts-orange)" },
              { label: "Pago DEPOIS", value: modoCampanha ? fmtBRL(campanha.valorPagoDepois) : fmtBRL(0), hint: modoCampanha ? `${campanha.percentualPagoDepois.toFixed(0)}% — saldo` : "—", color: "var(--tts-cyan)" },
              { label: "Capacidade", value: fmtNum(disparosEfetivos), hint: "disparos/mês", color: "var(--tts-text)" },
              { label: "Quantidade de números", value: String(quantidadeNumeros), hint: `${fmtNum(calc.minutosMes, 0)} min de áudio`, color: "var(--tts-cyan)" },
            ].map((k) => (
              <div key={k.label} className="tts-card p-4">
                <p className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono">{k.label}</p>
                <p className="font-mono text-2xl font-bold mt-1" style={{ color: k.color }}>{k.value}</p>
                <p className="text-[10px] text-[var(--tts-muted)] font-mono mt-1">{k.hint}</p>
              </div>
            ))}
          </div>

          {/* Texto comercial explicativo */}
          <div className="tts-card p-5 !border-[var(--tts-orange)]/40">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-display font-bold mb-2 text-[var(--tts-orange)]">Por que este investimento?</p>
                <p className="text-[var(--tts-muted)] leading-relaxed">
                  O investimento é dividido entre <span className="text-[var(--tts-text)] font-bold">tecnologia</span> (APIs de IA que geram texto e voz) e <span className="text-[var(--tts-text)] font-bold">operação especializada</span> (estratégia, monitoramento e otimização contínua). A API não substitui o trabalho — ela é a ferramenta. O resultado depende de quem opera.
                </p>
              </div>
              <div>
                <p className="font-display font-bold mb-2 text-[var(--tts-orange)]">Condição de pré-campanha</p>
                <p className="text-[var(--tts-muted)] leading-relaxed">
                  {modoCampanha
                    ? "A entrada cobre os custos imediatos e parte da operação. O saldo é programado para quando a verba de campanha for liberada — assim você começa agora sem comprometer a estrutura."
                    : "Ative o modo campanha para parcelar parte da operação e começar com entrada reduzida, mantendo todos os custos técnicos cobertos."}
                </p>
              </div>
            </div>
          </div>

          {/* Gráficos do dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* A — Donut: composição do preço */}
            <div className="tts-card p-4">
              <p className="text-xs uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">Composição do preço total</p>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "APIs (GPT + Áudio)", value: calc.custoApiBrl },
                      { name: "Infraestrutura", value: calc.custoInfraBrl },
                      { name: "Meu trabalho", value: calc.custoMoBrl },
                      { name: "Margem", value: Math.max(0, planoRecomendado.preco - calc.custoTotalMes) },
                    ].filter(d => d.value > 0)}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                    label={(e: any) => `${((e.value / planoRecomendado.preco) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    <Cell fill={CHART_COLORS.cyan} />
                    <Cell fill={CHART_COLORS.green} />
                    <Cell fill={CHART_COLORS.orange} />
                    <Cell fill={CHART_COLORS.gold} />
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* B — Barras empilhadas: divisão do pagamento */}
            <div className="tts-card p-4">
              <p className="text-xs uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">
                Divisão do pagamento {modoCampanha ? "(modo campanha)" : ""}
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={[
                    {
                      n: "Agora",
                      tecnico: campanha.custoTecnicoTotal,
                      moAgora: modoCampanha ? campanha.entradaMaoDeObra : campanha.maoDeObraTotal,
                      margem: campanha.margemBrl,
                      moDepois: 0,
                    },
                    {
                      n: "Depois",
                      tecnico: 0,
                      moAgora: 0,
                      margem: 0,
                      moDepois: modoCampanha ? campanha.saldoMaoDeObra : 0,
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="n" fontSize={11} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} fontSize={10} />
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="tecnico" name="Técnico (APIs+infra)" stackId="a" fill={CHART_COLORS.cyan} />
                  <Bar dataKey="moAgora" name="Operação (parte agora)" stackId="a" fill={CHART_COLORS.orange} />
                  <Bar dataKey="margem" name="Margem" stackId="a" fill={CHART_COLORS.gold} />
                  <Bar dataKey="moDepois" name="Operação (saldo)" stackId="a" fill={CHART_COLORS.purple} fillOpacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* C — Linha: escala por quantidade de números */}
            <div className="tts-card p-4">
              <p className="text-xs uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">Escala por quantidade de números</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={sensibilidade.map(s => {
                  const moAprox = calcularMaoDeObraPorNumero(s.numeros, moPlanoId, moCustomAtivo ? moPrecoCustom : undefined);
                  const tecnicoAprox = Math.max(0, s.custoTotalBrl - moAprox);
                  return {
                    numeros: s.numeros,
                    "Técnico": tecnicoAprox,
                    "Meu trabalho": moAprox,
                    "Preço final": s.precoVendaBrl,
                  };
                })}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="numeros" fontSize={11} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} fontSize={10} />
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Técnico" stroke={CHART_COLORS.cyan} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Meu trabalho" stroke={CHART_COLORS.orange} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Preço final" stroke={CHART_COLORS.gold} strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* D — Cascata (waterfall): formação do preço */}
            <div className="tts-card p-4">
              <p className="text-xs uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">Formação do preço final (cascata)</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={(() => {
                    const gpt = calc.custoTextoBrl;
                    const eleven = calc.custoAudioBrl;
                    const infra = calc.custoInfraBrl;
                    const trab = calc.custoMoBrl;
                    const margem = Math.max(0, planoRecomendado.preco - calc.custoTotalMes);
                    let acc = 0;
                    const step = (label: string, valor: number) => {
                      const base = acc; acc += valor;
                      return { etapa: label, base, valor };
                    };
                    return [
                      step("GPT", gpt),
                      step("ElevenLabs", eleven),
                      step("Infra", infra),
                      step("Meu trabalho", trab),
                      step("Margem", margem),
                      { etapa: "Total", base: 0, valor: planoRecomendado.preco },
                    ];
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="etapa" fontSize={10} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} fontSize={10} />
                  <Tooltip formatter={(v: number, name: string) => name === "valor" ? fmtBRL(v) : ""} />
                  <Bar dataKey="base" stackId="w" fill="transparent" />
                  <Bar dataKey="valor" stackId="w">
                    {[CHART_COLORS.cyan, CHART_COLORS.cyan, CHART_COLORS.green, CHART_COLORS.orange, CHART_COLORS.gold, CHART_COLORS.purple].map((c, i) => (
                      <Cell key={i} fill={c} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Cenários */}
        <section>
          <SectionTitle icon={<Sparkles className="size-4" />} title="Cenários rápidos" hint="Aplique presets aos sliders" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {CENARIOS.map(c => {
              const isSel = pctAudio === c.pctAudio && modoEscala === "manual";
              return (
                <button
                  key={c.nome}
                  onClick={() => { setModoEscala("manual"); aplicarCenario(c); }}
                  className={`tts-card p-4 text-left group transition-all hover:-translate-y-0.5 ${
                    isSel ? "!border-[var(--tts-orange)] tts-card-active" :
                    c.recomendado ? "!border-[var(--tts-orange)]/50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-display font-bold text-sm ${isSel ? "text-[var(--tts-orange)]" : ""}`}>{c.nome}</span>
                    {isSel
                      ? <span className="tts-badge tts-badge-orange">Selecionado</span>
                      : c.recomendado && <span className="tts-badge tts-badge-orange">Recomendado</span>}
                  </div>
                  <p className="text-xs text-[var(--tts-muted)] font-mono">{c.descricao}</p>
                </button>
              );
            })}
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

            {/* Toggle modo manual / proporcional */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-2">
                Modo de escala
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "manual" as const, label: "Manual", hint: "Sliders independentes" },
                  { id: "porNumero" as const, label: "Proporcional / nº", hint: "Tudo deriva da qtd de números" },
                ]).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setModoEscala(m.id)}
                    className={`tts-btn !text-xs flex-col !items-start !py-2 ${modoEscala === m.id ? "tts-btn-active" : ""}`}
                    title={m.hint}
                  >
                    <span>{m.label}</span>
                    <span className="text-[9px] font-mono normal-case opacity-80">{m.hint}</span>
                  </button>
                ))}
              </div>
              {modoEscala === "porNumero" && (
                <p className="text-[11px] text-[var(--tts-muted)] font-mono mt-2 leading-relaxed">
                  {escala.explicacao}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {modoEscala === "manual" ? (
                <>
                  <SliderInput label="Disparos / mês" value={totalDisparos} onChange={setTotalDisparos} min={1000} max={500000} step={500} />
                  <SliderInput
                    label="% Áudio"
                    value={pctAudio}
                    onChange={setPctAudio}
                    min={0} max={100} suffix="%"
                    hint={`Texto: ${100 - pctAudio}% · ${fmtNum(textosMes)} msgs`}
                  />
                </>
              ) : (
                <>
                  <SliderInput
                    label="Disparos por número"
                    value={disparosPorNumero}
                    onChange={setDisparosPorNumero}
                    min={50} max={5000} step={50}
                    hint={`Total: ${fmtNum(escala.disparosTotais)} disparos/mês`}
                  />
                  <SliderInput
                    label="Áudios por número"
                    value={audiosPorNumero}
                    onChange={setAudiosPorNumero}
                    min={0} max={Math.max(50, disparosPorNumero)} step={10}
                    hint={`${escala.pctAudioDerivado.toFixed(0)}% áudio · ${fmtNum(escala.audiosTotais)} áudios · ${fmtNum(escala.textosTotais)} textos`}
                  />
                </>
              )}
              <SliderInput label="Duração / áudio"    value={duracaoSeg}    onChange={setDuracaoSeg}    min={5} max={120} suffix="s" />
              <SliderInput label="Tokens / msg texto" value={tokensPorMsg}  onChange={setTokensPorMsg}  min={50} max={2000} step={10} />
              <div className="space-y-2">
                <SliderInput
                  label="Números WhatsApp ativos"
                  value={quantidadeNumeros}
                  onChange={setQuantidadeNumeros}
                  min={1} max={200} step={1}
                  hint={`MO ${moPlanoSel.nome}: ${fmtBRL(calc.custoMoBrl)}/mês (${calc.pctMoNoTotal.toFixed(1)}% do total)`}
                />
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mr-1 self-center">
                    Presets:
                  </span>
                  {[10, 30, 50, 100].map(n => (
                    <button
                      key={n}
                      onClick={() => setQuantidadeNumeros(n)}
                      className={`tts-btn !text-[10px] !py-1 !px-2.5 ${quantidadeNumeros === n ? "tts-btn-active" : ""}`}
                      title={`Aplicar ${n} números e recalcular tudo`}
                    >
                      {n} nº
                    </button>
                  ))}
                </div>
              </div>
              {modoEscala === "porNumero" && (
                <NumberField
                  label="Custo infra / número (R$)"
                  value={custoInfraPorNumero}
                  onChange={setCustoInfraPorNumero}
                  step={5}
                  prefix="R$"
                />
              )}
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
            <StatCard label="Mão de obra / mês" value={fmtBRL(calc.custoMoBrl)} sub={`${quantidadeNumeros} nº × ${fmtBRL(moPlanoSel.precoPorNumero)} (${moPlanoSel.nome})`} />
            <StatCard label="Custo total / mês" value={fmtBRL(calc.custoTotalMes)} accent="orange" large />
            <StatCard label="Custo / disparo" value={fmtBRL(calc.custoPorDisparo)} sub={`${fmtNum(disparosEfetivos)} disparos · custo total ÷ disparos`} accent="cyan" />
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
                  {([
                    ["Plano base",          `${fmtUSD(calc.eleven.plano.fixoUsd)}/mês`],
                    ["Minutos inclusos",    `${fmtNum(calc.eleven.minutosInclusos)} min`],
                    ["Minutos necessários", `${fmtNum(calc.eleven.minutosNecessarios, 1)} min`],
                    ["Excedente",           `${fmtNum(calc.eleven.excedenteMin, 1)} min`],
                    ["Custo excedente",     fmtUSD(calc.eleven.excedenteUsd)],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[var(--tts-muted)]">
                      <span>{k}</span>
                      <span className="text-[var(--tts-text)]">{v}</span>
                    </div>
                  ))}
                  <div className="border-t border-[var(--tts-border)] pt-1.5 mt-1.5 flex justify-between font-bold">
                    <span>Total ElevenLabs</span>
                    <span style={{ color: "var(--tts-orange)" }}>{fmtUSD(calc.eleven.totalUsd)}/mês</span>
                  </div>
                </div>

                {/* Motivo da recomendação */}
                <div className="mt-4 p-3 rounded-md bg-[var(--tts-surface-2)] border border-[var(--tts-border)]">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-1">
                    Por que este plano?
                  </p>
                  <p className="text-[11px] font-mono leading-relaxed">
                    {calc.eleven.motivoRecomendacao}
                  </p>
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

        {/* Mão de Obra — seleção de plano e comparativo vs R$ 100/número */}
        <section>
          <SectionTitle
            icon={<Wrench className="size-4" />}
            title="Mão de Obra (por número de WhatsApp)"
            hint={`${quantidadeNumeros} números ativos`}
          />
          <p className="text-xs text-[var(--tts-muted)] font-mono mb-4">
            Inclui setup, ajustes de fluxo, monitoramento, suporte durante a campanha e otimização contínua.
          </p>

          {/* Cards dos planos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {(Object.values(MO_PLANOS)).map(p => {
              const total = calc.moPorPlano[p.id];
              const isSel = p.id === moPlanoId;
              return (
                <button
                  key={p.id}
                  onClick={() => setMoPlanoId(p.id)}
                  className={`tts-card p-5 text-left transition-all hover:-translate-y-0.5 ${
                    isSel ? "!border-[var(--tts-orange)] tts-card-active" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display font-bold">{p.rotulo}</h3>
                    {isSel && <span className="tts-badge tts-badge-orange">Selecionado</span>}
                  </div>
                  <div className="font-mono text-2xl font-bold" style={{ color: isSel ? "var(--tts-orange)" : "var(--tts-text)" }}>
                    {fmtBRL(p.precoPorNumero)}
                    <span className="text-[10px] text-[var(--tts-muted)] font-normal">/número</span>
                  </div>
                  <p className="text-[11px] text-[var(--tts-muted)] font-mono mb-3">
                    Total p/ {quantidadeNumeros} nº: <span className="text-[var(--tts-text)] font-bold">{fmtBRL(total)}</span>/mês
                  </p>
                  <ul className="text-xs space-y-1">
                    {p.inclui.map(f => (
                      <li key={f} className="flex items-start gap-1.5">
                        <Check className="size-3 text-[var(--tts-green)] mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* Comparativo: legado vs novo */}
          {(() => {
            const legado = calc.custoMoLegadoBrl;
            const novo = calc.custoMoBrl;
            const diff = novo - legado;
            const diffPct = legado > 0 ? (diff / legado) * 100 : 0;
            return (
              <div className="tts-card p-5 !border-[var(--tts-orange)]">
                <p className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">
                  Comparativo · cobrança atual vs nova precificação
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-mono">
                  <div>
                    <p className="text-[10px] text-[var(--tts-muted)] uppercase">Cobrando R$ 100/número (atual)</p>
                    <p className="text-xl font-bold">{fmtBRL(legado)}/mês</p>
                    <p className="text-[10px] text-[var(--tts-muted)]">{quantidadeNumeros} × R$ 100</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--tts-muted)] uppercase">Plano {moPlanoSel.nome} (novo)</p>
                    <p className="text-xl font-bold" style={{ color: "var(--tts-orange)" }}>{fmtBRL(novo)}/mês</p>
                    <p className="text-[10px] text-[var(--tts-muted)]">{quantidadeNumeros} × {fmtBRL(moPlanoSel.precoPorNumero)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--tts-muted)] uppercase">Diferença</p>
                    <p className="text-xl font-bold" style={{ color: diff >= 0 ? "var(--tts-green)" : "var(--tts-red)" }}>
                      {diff >= 0 ? "+" : ""}{fmtBRL(diff)}
                    </p>
                    <p className="text-[10px] text-[var(--tts-muted)]">
                      {diff >= 0 ? "+" : ""}{diffPct.toFixed(1)}% · subprecificação corrigida
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[var(--tts-border)] text-xs font-mono">
                  <div className="flex justify-between"><span className="text-[var(--tts-muted)]">MO no custo total</span><span className="font-bold">{calc.pctMoNoTotal.toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-[var(--tts-muted)]">Custo / número</span><span className="font-bold">{fmtBRL(calc.custoPorNumero)}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--tts-muted)]">Custo total / mês</span><span className="font-bold" style={{ color: "var(--tts-orange)" }}>{fmtBRL(calc.custoTotalMes)}</span></div>
                </div>

                {/* Tabela rápida dos 3 planos */}
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-[10px] uppercase text-[var(--tts-muted)] border-b border-[var(--tts-border)]">
                        <th className="text-left p-2">Plano</th>
                        <th className="text-right p-2">R$ / número</th>
                        <th className="text-right p-2">Total MO/mês</th>
                        <th className="text-right p-2">% do custo total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Object.values(MO_PLANOS)).map(p => {
                        const total = calc.moPorPlano[p.id];
                        const pct = calcularPercentualMaoDeObra(calc.custoTecnicoBrl, total);
                        const isSel = p.id === moPlanoId;
                        return (
                          <tr key={p.id} className={`border-b border-[var(--tts-border)]/60 ${isSel ? "bg-[var(--tts-surface-2)]" : ""}`}>
                            <td className="p-2">
                              <span className={isSel ? "font-bold text-[var(--tts-orange)]" : ""}>{p.nome}</span>
                              {isSel && <span className="ml-1 text-[9px]">★</span>}
                            </td>
                            <td className="p-2 text-right">{fmtBRL(p.precoPorNumero)}</td>
                            <td className="p-2 text-right font-bold">{fmtBRL(total)}</td>
                            <td className="p-2 text-right">{pct.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sensibilidade: impacto de qtd de números × planos */}
                <div className="overflow-x-auto mt-4">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-2">
                    Sensibilidade · MO total/mês por quantidade de números
                  </p>
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-[10px] uppercase text-[var(--tts-muted)] border-b border-[var(--tts-border)]">
                        <th className="text-left p-2">Plano</th>
                        {[10, 30, 50, 100].map(n => (
                          <th key={n} className="text-right p-2">{n} nº</th>
                        ))}
                        <th className="text-right p-2 text-[var(--tts-orange)]">{quantidadeNumeros} nº (atual)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Object.values(MO_PLANOS)).map(p => {
                        const isSel = p.id === moPlanoId;
                        return (
                          <tr key={p.id} className={`border-b border-[var(--tts-border)]/60 ${isSel ? "bg-[var(--tts-surface-2)]" : ""}`}>
                            <td className="p-2">
                              <span className={isSel ? "font-bold text-[var(--tts-orange)]" : ""}>{p.nome}</span>
                            </td>
                            {[10, 30, 50, 100].map(n => (
                              <td key={n} className="p-2 text-right">
                                {fmtBRL(calcularMaoDeObraPorNumero(n, p.id))}
                              </td>
                            ))}
                            <td className={`p-2 text-right font-bold ${isSel ? "text-[var(--tts-orange)]" : ""}`}>
                              {fmtBRL(calcularMaoDeObraPorNumero(quantidadeNumeros, p.id))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
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

        {/* === Gráficos comerciais === */}
        <section>
          <SectionTitle icon={<TrendingUp className="size-4" />} title="Visão comercial" hint="Como seu preço se forma e como escala com o volume" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* A) Composição do preço */}
            <div className="tts-card p-4 md:p-6">
              <div className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">
                Como seu preço final é composto
              </div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={[{
                      name: "Preço final",
                      "Custo técnico (APIs + infra)": calc.custoTecnicoBrl,
                      "Mão de obra": calc.custoMoBrl,
                      "Lucro": planoRecomendado.lucroMes,
                    }]}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" />
                    <XAxis type="number" stroke="#4f617a" tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickFormatter={(v) => "R$" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0))} />
                    <YAxis type="category" dataKey="name" stroke="#4f617a" tick={{ fill: "#94a3b8", fontSize: 12 }} width={90} />
                    <Tooltip contentStyle={{ background: "#0d1119", border: "1px solid #1a2235", borderRadius: 8, fontSize: 12, color: "#d8e4f5" }}
                      formatter={(v: number) => fmtBRL(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Custo técnico (APIs + infra)" stackId="a" fill={CHART_COLORS.cyan} />
                    <Bar dataKey="Mão de obra"                  stackId="a" fill={CHART_COLORS.purple} />
                    <Bar dataKey="Lucro"                        stackId="a" fill={CHART_COLORS.green} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] font-mono">
                <div><p className="text-[var(--tts-muted)]">Técnico</p><p className="font-bold">{fmtBRL(calc.custoTecnicoBrl)}</p></div>
                <div><p className="text-[var(--tts-muted)]">MO</p><p className="font-bold">{fmtBRL(calc.custoMoBrl)}</p></div>
                <div><p className="text-[var(--tts-muted)]">Preço</p><p className="font-bold" style={{ color: "var(--tts-orange)" }}>{fmtBRL(planoRecomendado.preco)}</p></div>
              </div>
            </div>

            {/* C) Comparação dos 3 planos */}
            <div className="tts-card p-4 md:p-6">
              <div className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">
                Comparação dos planos · preço × lucro × capacidade
              </div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={planos.map(p => ({
                      nome: p.nome,
                      "Preço final": p.preco,
                      "Lucro": p.lucroMes,
                      "Capacidade (mil)": p.capacidadeDisparos / 1000,
                    }))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" />
                    <XAxis dataKey="nome" stroke="#4f617a" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis yAxisId="left" stroke="#4f617a" tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickFormatter={(v) => "R$" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0))} />
                    <YAxis yAxisId="right" orientation="right" stroke="#4f617a" tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickFormatter={(v) => v + "k"} />
                    <Tooltip contentStyle={{ background: "#0d1119", border: "1px solid #1a2235", borderRadius: 8, fontSize: 12, color: "#d8e4f5" }}
                      formatter={(v: number, name: string) => name === "Capacidade (mil)" ? [fmtNum(v, 1) + "k disparos", name] : [fmtBRL(v), name]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="Preço final" fill={CHART_COLORS.orange} radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="left" dataKey="Lucro"       fill={CHART_COLORS.green}  radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="right" dataKey="Capacidade (mil)" fill={CHART_COLORS.cyan} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* B) Linha — escala por quantidade de números */}
          <div className="tts-card p-4 md:p-6 mt-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono">
                Escala por quantidade de números (10 · 30 · 50 · 100)
              </div>
              <span className="text-[10px] text-[var(--tts-muted)] font-mono">
                Atual: <span className="text-[var(--tts-orange)] font-bold">{quantidadeNumeros} nº</span>
              </span>
            </div>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={sensibilidade} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" />
                  <XAxis dataKey="numeros" stroke="#4f617a" tick={{ fill: "#94a3b8", fontSize: 12 }}
                    label={{ value: "Quantidade de números", position: "insideBottom", offset: -2, fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis stroke="#4f617a" tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(v) => "R$" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0))} />
                  <Tooltip contentStyle={{ background: "#0d1119", border: "1px solid #1a2235", borderRadius: 8, fontSize: 12, color: "#d8e4f5" }}
                    formatter={(v: number) => fmtBRL(v)}
                    labelFormatter={(l) => `${l} números`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="custoTotalBrl" name="Custo total"  stroke={CHART_COLORS.cyan}   strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="precoVendaBrl" name="Preço final"  stroke={CHART_COLORS.orange} strokeWidth={3} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="lucroMes"      name="Lucro/mês"    stroke={CHART_COLORS.green}  strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-[10px] uppercase text-[var(--tts-muted)] border-b border-[var(--tts-border)]">
                    <th className="text-left p-2">Números</th>
                    <th className="text-right p-2">Disparos/mês</th>
                    <th className="text-right p-2">Custo total</th>
                    <th className="text-right p-2">Preço final</th>
                    <th className="text-right p-2">Lucro/mês</th>
                    <th className="text-right p-2">Custo/disparo</th>
                  </tr>
                </thead>
                <tbody>
                  {sensibilidade.map(s => {
                    const isAtual = s.numeros === quantidadeNumeros;
                    return (
                      <tr key={s.numeros} className={`border-b border-[var(--tts-border)]/60 ${isAtual ? "bg-[var(--tts-surface-2)]" : ""}`}>
                        <td className="p-2">
                          <span className={isAtual ? "font-bold text-[var(--tts-orange)]" : ""}>{s.numeros} nº</span>
                          {isAtual && <span className="ml-1 text-[9px]">★ atual</span>}
                        </td>
                        <td className="p-2 text-right">{fmtNum(s.disparos)}</td>
                        <td className="p-2 text-right">{fmtBRL(s.custoTotalBrl)}</td>
                        <td className="p-2 text-right font-bold" style={{ color: "var(--tts-orange)" }}>{fmtBRL(s.precoVendaBrl)}</td>
                        <td className="p-2 text-right" style={{ color: "var(--tts-green)" }}>{fmtBRL(s.lucroMes)}</td>
                        <td className="p-2 text-right text-[var(--tts-muted)]">{fmtBRL(s.custoPorDisparo)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Por que vale a pena (área comercial) */}
        <section>
          <SectionTitle icon={<Sparkles className="size-4" />} title="Por que vale a pena" hint="Resumo de valor para o cliente" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { t: "Operação 100% automatizada", d: "Áudio + texto disparados sem trabalho manual." },
              { t: "Padronização total", d: "Mesmo padrão de qualidade em todos os números." },
              { t: "Escala com múltiplos números", d: `Operamos hoje ${quantidadeNumeros} números em paralelo.` },
              { t: "Áudio de qualidade superior", d: "ElevenLabs com voice cloning e naturalidade real." },
              { t: "Suporte de campanha", d: "Equipe acompanha do setup ao fim da operação." },
              { t: "Previsibilidade de custo", d: "Você sabe exatamente quanto vai pagar todo mês." },
            ].map(b => (
              <div key={b.t} className="tts-card p-4">
                <div className="flex items-start gap-2">
                  <Check className="size-4 text-[var(--tts-green)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">{b.t}</p>
                    <p className="text-xs text-[var(--tts-muted)] font-mono mt-1">{b.d}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Proposta — 3 planos comerciais com âncora */}
        <section className="tts-print-section">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <SectionTitle
              icon={<Sparkles className="size-4" />}
              title={nomeCliente ? `Proposta para ${nomeCliente}` : "Escolha seu plano"}
              hint={`${quantidadeNumeros} números · ${fmtNum(disparosEfetivos)} disparos/mês`}
            />
            <div className="flex gap-2">
              <button onClick={salvarSimulacao} className="tts-btn !text-xs">
                {salvo ? <><Check className="size-3" /> Salvo!</> : <><Save className="size-3" /> Salvar</>}
              </button>
              <button onClick={exportarPDF} className="tts-btn !text-xs">
                <Printer className="size-3" /> Exportar PDF
              </button>
              <button onClick={() => copiarProposta(planoRecomendado)} className="tts-btn-primary !text-xs">
                {copiado ? <><Check className="size-3" /> Copiado!</> : <><Copy className="size-3" /> Copiar Profissional</>}
              </button>
            </div>
          </div>

          {/* Banner âncora — economia entre Essencial → Profissional */}
          {(() => {
            const ess = planos[0];
            const pro = planos[1];
            const prem = planos[2];
            const diffProEss = pro.preco - ess.preco;
            const featsExtras = pro.features.length - ess.features.length;
            return (
              <div className="tts-card p-4 mb-4 !border-[var(--tts-orange)]/60 bg-[var(--tts-surface-2)]">
                <p className="text-sm">
                  <span className="font-bold" style={{ color: "var(--tts-orange)" }}>
                    Por apenas {fmtBRL(diffProEss)}/mês a mais que o Essencial
                  </span>
                  <span className="text-[var(--tts-muted)]">, você leva </span>
                  <span className="font-bold">{Math.max(2, featsExtras)} benefícios extras</span>
                  <span className="text-[var(--tts-muted)]"> · áudio profissional · ajustes semanais · capacidade até </span>
                  <span className="font-bold">{fmtNum(pro.capacidadeDisparos)}</span>
                  <span className="text-[var(--tts-muted)]"> disparos/mês.</span>
                </p>
                <p className="text-[11px] text-[var(--tts-muted)] font-mono mt-1">
                  Premium custa {fmtBRL(prem.preco - pro.preco)} a mais que o Profissional — escolha quem quer SLA enterprise.
                </p>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {planos.map(p => {
              const accent = p.destaque ? "var(--tts-orange)" : p.id === "premium" ? "var(--tts-cyan)" : "var(--tts-text)";
              return (
                <div
                  key={p.id}
                  className={`tts-card p-6 flex flex-col relative transition-all ${
                    p.destaque
                      ? "!border-[var(--tts-orange)] tts-card-active md:-translate-y-3 md:scale-[1.03] shadow-[0_20px_60px_-20px_rgba(139,92,246,0.5)] z-10"
                      : "opacity-95 hover:opacity-100"
                  }`}
                >
                  {p.badge && (
                    <span
                      className={`tts-badge absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 ${
                        p.destaque ? "tts-badge-orange" : "tts-badge-cyan"
                      } bg-[var(--tts-bg)] border border-current`}
                    >
                      ★ {p.badge}
                    </span>
                  )}
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-2xl font-bold">{p.nome}</h3>
                    <span className="text-[10px] uppercase font-mono text-[var(--tts-muted)]">{p.prioridade}</span>
                  </div>
                  <p className="text-xs text-[var(--tts-muted)] font-mono mb-3">{p.subtitulo}</p>

                  <div className="font-mono text-4xl font-bold mb-1" style={{ color: accent }}>
                    {fmtBRL(p.preco)}
                    <span className="text-xs text-[var(--tts-muted)] font-normal">/mês</span>
                  </div>
                  <p className="text-[11px] text-[var(--tts-muted)] font-mono mb-3">
                    Setup único: <span className="text-[var(--tts-text)] font-bold">{fmtBRL(p.setup)}</span>
                  </p>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-[10px] font-mono">
                    <div className="p-2 rounded bg-[var(--tts-surface-2)]">
                      <p className="text-[var(--tts-muted)] uppercase tracking-wider mb-0.5">Capacidade</p>
                      <p className="font-bold text-[var(--tts-text)]">{fmtNum(p.capacidadeDisparos)} disparos/mês</p>
                    </div>
                    <div className="p-2 rounded bg-[var(--tts-surface-2)]">
                      <p className="text-[var(--tts-muted)] uppercase tracking-wider mb-0.5">Margem</p>
                      <p className="font-bold" style={{ color: "var(--tts-green)" }}>
                        {(p.margemReal * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="p-2 rounded bg-[var(--tts-surface-2)] col-span-2">
                      <p className="text-[var(--tts-muted)] uppercase tracking-wider mb-0.5">SLA</p>
                      <p className="font-bold text-[var(--tts-text)]">{p.sla}</p>
                    </div>
                  </div>

                  <ul className="space-y-1.5 text-sm flex-1 mb-4">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="size-4 mt-0.5 shrink-0" style={{ color: accent }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-[10px] text-[var(--tts-muted)] font-mono mb-3 italic">
                    Ideal para: {p.recomendadoPara}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => copiarProposta(p)} className={p.destaque ? "tts-btn-primary !text-xs" : "tts-btn !text-xs"}>
                      <Copy className="size-3" /> WhatsApp
                    </button>
                    <button onClick={() => baixarPropostaPDF(p)} className="tts-btn !text-xs">
                      <FileDown className="size-3" /> PDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumo comercial pronto para venda */}
          <div className="tts-card p-5 mt-6 !border-[var(--tts-orange)]">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-[var(--tts-orange)]" />
              <h3 className="font-display font-bold">Resumo comercial</h3>
              <span className="tts-badge tts-badge-orange ml-auto">Plano recomendado: {planoRecomendado.nome}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm font-mono">
              <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">Números ativos</p><p className="font-bold text-base">{quantidadeNumeros}</p></div>
              <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">Capacidade/mês</p><p className="font-bold text-base">{fmtNum(planoRecomendado.capacidadeDisparos)} disparos</p></div>
              <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">Minutos áudio</p><p className="font-bold text-base">{fmtNum(calc.minutosMes, 1)} min</p></div>
              <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">Custo operacional</p><p className="font-bold text-base">{fmtBRL(calc.custoTotalMes)}</p></div>
              <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">Preço final</p><p className="font-bold text-base" style={{ color: "var(--tts-orange)" }}>{fmtBRL(planoRecomendado.preco)}</p></div>
              <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">Lucro estimado</p><p className="font-bold text-base" style={{ color: "var(--tts-green)" }}>{fmtBRL(planoRecomendado.lucroMes)}</p></div>
              <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">Margem</p><p className="font-bold text-base" style={{ color: "var(--tts-green)" }}>{(planoRecomendado.margemReal * 100).toFixed(0)}%</p></div>
              <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">Setup único</p><p className="font-bold text-base">{fmtBRL(planoRecomendado.setup)}</p></div>
            </div>
          </div>
        </section>

        {/* ===== Condição comercial para início imediato (modo campanha) ===== */}
        <section className="tts-print-section">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <SectionTitle
              icon={<CalendarClock className="size-4" />}
              title="Condição comercial para início imediato"
              hint="Pagamento diferido — ideal para candidatos sem caixa hoje"
            />
            <label className="tts-btn !text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                className="accent-[var(--tts-orange)]"
                checked={modoCampanha}
                onChange={(e) => setModoCampanha(e.target.checked)}
              />
              {modoCampanha ? "Modo campanha ATIVO" : "Ativar modo campanha"}
            </label>
          </div>

          {modoCampanha && (
            <>
              {/* Presets + custom */}
              <div className="tts-card p-4 mb-4">
                <p className="text-xs uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">
                  Quanto da mão de obra entra agora?
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {([
                    ["30/70", 30], ["40/60", 40], ["50/50", 50], ["60/40", 60],
                  ] as const).map(([label, pct]) => (
                    <button
                      key={label}
                      onClick={() => { setPresetCampanha(label); setPctEntradaMO(pct); }}
                      className={`tts-btn !text-xs !py-2 !px-4 ${presetCampanha === label ? "tts-btn-active" : ""}`}
                    >
                      {label} <span className="text-[10px] opacity-70 ml-1">({pct}% agora)</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setPresetCampanha("custom")}
                    className={`tts-btn !text-xs !py-2 !px-4 ${presetCampanha === "custom" ? "tts-btn-active" : ""}`}
                  >
                    Personalizado
                  </button>
                  <button
                    onClick={() => {
                      const min = Math.ceil(campanha.pctEntradaMinimaSegura);
                      setPctEntradaMO(min);
                      setPresetCampanha("custom");
                    }}
                    className="tts-btn !text-xs !py-2 !px-4 !border-[var(--tts-green)] text-[var(--tts-green)]"
                    title="Define o % mínimo que cobre custos técnicos + reserva"
                  >
                    <ShieldCheck className="size-3" /> Entrada mínima segura ({Math.ceil(campanha.pctEntradaMinimaSegura)}%)
                  </button>
                </div>

                {presetCampanha === "custom" && (
                  <div className="mb-3">
                    <SliderInput
                      label="% da mão de obra na entrada"
                      value={pctEntradaMO}
                      min={0} max={100} step={5}
                      onChange={setPctEntradaMO}
                      suffix="%"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <NumberField
                    label="Reserva mínima de caixa"
                    value={reservaMinima}
                    onChange={setReservaMinima}
                    step={500}
                    prefix="R$"
                  />
                  <div className="flex items-end text-[11px] text-[var(--tts-muted)] font-mono">
                    Folga adicional sobre o custo técnico que você quer garantir na entrada.
                  </div>
                </div>
              </div>

              {/* Banner de risco */}
              {campanha.risco === "alto" && (
                <div className="tts-card p-4 mb-4 !border-[var(--tts-red)]" style={{ background: "color-mix(in oklab, var(--tts-red) 8%, transparent)" }}>
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="size-5 text-[var(--tts-red)] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-[var(--tts-red)]">RISCO ALTO — entrada não cobre os custos técnicos</p>
                      <p className="text-sm text-[var(--tts-muted)] font-mono mt-1">
                        Você receberá {fmtBRL(campanha.valorPagoAgora)} agora, mas vai gastar {fmtBRL(campanha.custoTecnicoTotal)} em APIs/infra.
                        Suba para no mínimo <span className="text-[var(--tts-text)] font-bold">{Math.ceil(campanha.pctEntradaMinimaSegura)}%</span> da MO na entrada.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {campanha.risco === "medio" && (
                <div className="tts-card p-4 mb-4 !border-[var(--tts-gold)]" style={{ background: "color-mix(in oklab, var(--tts-gold) 8%, transparent)" }}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="size-5 text-[var(--tts-gold)] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-[var(--tts-gold)]">Atenção — entrada cobre custos mas sem reserva</p>
                      <p className="text-sm text-[var(--tts-muted)] font-mono mt-1">
                        Cobertura técnica: {fmtBRL(campanha.coberturaTecnica)} · Reserva mínima desejada: {fmtBRL(reservaMinima)}.
                        Faltam {fmtBRL(reservaMinima - campanha.coberturaTecnica)}.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {campanha.risco === "ok" && (
                <div className="tts-card p-4 mb-4 !border-[var(--tts-green)]" style={{ background: "color-mix(in oklab, var(--tts-green) 8%, transparent)" }}>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="size-5 text-[var(--tts-green)] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-[var(--tts-green)]">Operação segura</p>
                      <p className="text-sm text-[var(--tts-muted)] font-mono mt-1">
                        Custos técnicos cobertos com folga de {fmtBRL(campanha.coberturaTecnica)} · margem preservada.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cards Agora / Depois */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="tts-card p-5 !border-[var(--tts-orange)]">
                  <p className="text-xs uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-1">Pago AGORA (entrada)</p>
                  <p className="font-mono text-4xl font-bold" style={{ color: "var(--tts-orange)" }}>{fmtBRL(campanha.valorPagoAgora)}</p>
                  <p className="text-sm text-[var(--tts-muted)] font-mono mt-1">{campanha.percentualPagoAgora.toFixed(1)}% do total</p>
                  <p className="text-xs text-[var(--tts-muted)] font-mono mt-3">
                    Cobre: técnico ({fmtBRL(campanha.custoTecnicoTotal)}) + {pctEntradaMO}% MO ({fmtBRL(campanha.entradaMaoDeObra)}) + margem ({fmtBRL(campanha.margemBrl)})
                  </p>
                </div>
                <div className="tts-card p-5">
                  <p className="text-xs uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-1">Pago DEPOIS (saldo)</p>
                  <p className="font-mono text-4xl font-bold">{fmtBRL(campanha.valorPagoDepois)}</p>
                  <p className="text-sm text-[var(--tts-muted)] font-mono mt-1">{campanha.percentualPagoDepois.toFixed(1)}% do total</p>
                  <p className="text-xs text-[var(--tts-muted)] font-mono mt-3">
                    Saldo de mão de obra · programado para liberação da verba de campanha.
                  </p>
                </div>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {/* A — Barra empilhada */}
                <div className="tts-card p-4">
                  <p className="text-xs uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">Composição do preço</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={[{
                      n: "Total",
                      tecnico: campanha.custoTecnicoTotal,
                      moAgora: campanha.entradaMaoDeObra,
                      margem: campanha.margemBrl,
                      moDepois: campanha.saldoMaoDeObra,
                    }]} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis type="number" tickFormatter={(v) => fmtBRL(v)} fontSize={10} />
                      <YAxis type="category" dataKey="n" hide />
                      <Tooltip formatter={(v: number) => fmtBRL(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="tecnico" name="Técnico (agora)" stackId="a" fill={CHART_COLORS.green} />
                      <Bar dataKey="moAgora" name="MO agora" stackId="a" fill={CHART_COLORS.orange} />
                      <Bar dataKey="margem" name="Margem (agora)" stackId="a" fill={CHART_COLORS.gold} />
                      <Bar dataKey="moDepois" name="MO depois" stackId="a" fill={CHART_COLORS.purple} fillOpacity={0.5} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* B — Donut % */}
                <div className="tts-card p-4">
                  <p className="text-xs uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">Agora vs. Depois</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Agora", value: campanha.valorPagoAgora, cor: CHART_COLORS.orange },
                          { name: "Depois", value: campanha.valorPagoDepois, cor: CHART_COLORS.purple },
                        ]}
                        dataKey="value"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        label={(e: any) => `${((e.value / campanha.precoTotal) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        <Cell fill={CHART_COLORS.orange} />
                        <Cell fill={CHART_COLORS.purple} />
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtBRL(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* C — Cenários comparativos */}
                <div className="tts-card p-4">
                  <p className="text-xs uppercase tracking-wider text-[var(--tts-muted)] font-mono mb-3">Cenários (entrada de MO)</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={cenariosCampanha.map(c => ({
                      cenario: `${c.pct}%`,
                      agora: c.agora,
                      depois: c.depois,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="cenario" fontSize={10} />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} fontSize={10} />
                      <Tooltip formatter={(v: number) => fmtBRL(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="agora" name="Agora" fill={CHART_COLORS.orange} />
                      <Bar dataKey="depois" name="Depois" fill={CHART_COLORS.purple} fillOpacity={0.6} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Resumo final */}
              <div className="tts-card p-5 !border-[var(--tts-orange)]">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarClock className="size-4 text-[var(--tts-orange)]" />
                  <h3 className="font-display font-bold">Resumo da condição especial</h3>
                  <span className={`tts-badge ml-auto ${
                    campanha.risco === "ok" ? "tts-badge-ok" :
                    campanha.risco === "medio" ? "tts-badge-orange" : "tts-badge-danger"
                  }`}>
                    {campanha.risco === "ok" ? "Margem protegida" : campanha.risco === "medio" ? "Sem reserva" : "RISCO ALTO"}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm font-mono">
                  <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">Números</p><p className="font-bold text-base">{quantidadeNumeros}</p></div>
                  <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">Custo técnico</p><p className="font-bold text-base">{fmtBRL(campanha.custoTecnicoTotal)}</p></div>
                  <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">Mão de obra total</p><p className="font-bold text-base">{fmtBRL(campanha.maoDeObraTotal)}</p></div>
                  <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">Preço total</p><p className="font-bold text-base">{fmtBRL(campanha.precoTotal)}</p></div>
                  <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">Entrada (agora)</p><p className="font-bold text-base" style={{ color: "var(--tts-orange)" }}>{fmtBRL(campanha.valorPagoAgora)}</p></div>
                  <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">Saldo (depois)</p><p className="font-bold text-base">{fmtBRL(campanha.valorPagoDepois)}</p></div>
                  <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">% agora</p><p className="font-bold text-base">{campanha.percentualPagoAgora.toFixed(1)}%</p></div>
                  <div><p className="text-[10px] uppercase text-[var(--tts-muted)]">% depois</p><p className="font-bold text-base">{campanha.percentualPagoDepois.toFixed(1)}%</p></div>
                </div>
              </div>
            </>
          )}

          {!modoCampanha && (
            <div className="tts-card p-4 text-sm text-[var(--tts-muted)] font-mono">
              Ative o modo campanha para oferecer entrada reduzida (com saldo programado para a liberação da verba de campanha) sem comprometer seus custos técnicos.
            </div>
          )}
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
                  onChange={(v) => { setRampMeses(v); setRampPreset(null); }}
                  min={2} max={12} suffix="meses"
                />
                <SliderInput
                  label="Disparos no mês 1"
                  value={rampDisparosIni}
                  onChange={(v) => { setRampDisparosIni(v); setRampPreset(null); }}
                  min={500} max={Math.max(500, disparosEfetivos)} step={500}
                  hint={`Meta no mês ${rampMeses}: ${fmtNum(disparosEfetivos)}`}
                />
                <SliderInput
                  label="% Áudio no mês 1"
                  value={rampPctAudioIni}
                  onChange={(v) => { setRampPctAudioIni(v); setRampPreset(null); }}
                  min={0} max={100} suffix="%"
                  hint={`Meta: ${pctAudioEfetivo.toFixed(0)}%`}
                />
                <SliderInput
                  label="Números no mês 1"
                  value={rampNumerosIni}
                  onChange={(v) => { setRampNumerosIni(v); setRampPreset(null); }}
                  min={1} max={Math.max(quantidadeNumeros, 1)} step={1}
                  hint={`Meta: ${quantidadeNumeros} números (plano ${moPlanoSel.nome})`}
                />
              </div>

              {/* Botões de preset proporcional 1/N da meta */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--tts-muted)] font-mono mr-1">
                  Mês 1 = 1/N da meta:
                </span>
                {[2, 3, 4, 6, 12].map(n => {
                  const ativo = rampPreset === n;
                  return (
                    <button
                      key={n}
                      onClick={() => {
                        setRampMeses(n);
                        setRampDisparosIni(Math.max(500, Math.round(disparosEfetivos / n / 500) * 500));
                        setRampPctAudioIni(Math.round(pctAudioEfetivo / n));
                        setRampNumerosIni(Math.max(1, Math.round(quantidadeNumeros / n)));
                        setRampPreset(n);
                      }}
                      className={`tts-btn !text-xs !py-1 !px-3 ${ativo ? "tts-btn-active" : ""}`}
                      title={`Começa com 1/${n} do volume final e cresce em ${n} meses`}
                    >
                      1/{n} ({n}m)
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    setRampDisparosIni(disparosEfetivos);
                    setRampPctAudioIni(pctAudioEfetivo);
                    setRampNumerosIni(quantidadeNumeros);
                    setRampPreset("full");
                  }}
                  className={`tts-btn !text-xs !py-1 !px-3 ${rampPreset === "full" ? "tts-btn-active" : ""}`}
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
                            numeros: m.numeros,
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
                              name === "Números ativos" ? `${v} nº` : fmtNum(Number(v))
                            }
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line yAxisId="left" type="monotone" dataKey="audios" stroke={CHART_COLORS.purple}
                            strokeWidth={2} dot={{ r: 3 }} name="Áudios/mês" />
                          <Line yAxisId="left" type="monotone" dataKey="textos" stroke={CHART_COLORS.cyan}
                            strokeWidth={2} dot={{ r: 3 }} name="Textos/mês" />
                          <Line yAxisId="right" type="monotone" dataKey="numeros" stroke={CHART_COLORS.orange}
                            strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Números ativos" />
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
                          <th className="text-right p-3">Números</th>
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
                            <td className="p-3 text-right">{m.numeros} <span className="text-[var(--tts-muted)]">({fmtBRL(m.custoMoBrl)})</span></td>
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

      <PresentationMode
        open={apresentacaoAberta}
        onClose={() => setApresentacaoAberta(false)}
        nomeCliente={nomeCliente}
        planos={planos}
        quantidadeNumeros={quantidadeNumeros}
        disparosEfetivos={disparosEfetivos}
        minutosMes={calc.minutosMes}
        onCopiarProposta={copiarProposta}
        onBaixarPDF={baixarPropostaPDF}
      />
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
