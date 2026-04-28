// Engine de cálculo da TTS Cost Calculator. Funções puras.

export type ElevenPlanId = "creator" | "pro" | "scale" | "business";

export interface ElevenPlan {
  id: ElevenPlanId;
  nome: string;
  fixoUsd: number;
  minutosInclusos: number;
  taxaExcedenteUsd: number; // por minuto
}

export const ELEVEN_PLANS: ElevenPlan[] = [
  { id: "creator",  nome: "Creator",  fixoUsd: 22,   minutosInclusos: 100,    taxaExcedenteUsd: 0.18 },
  { id: "pro",      nome: "Pro",      fixoUsd: 99,   minutosInclusos: 600,    taxaExcedenteUsd: 0.18 },
  { id: "scale",    nome: "Scale",    fixoUsd: 330,  minutosInclusos: 1800,   taxaExcedenteUsd: 0.17 },
  { id: "business", nome: "Business", fixoUsd: 1320, minutosInclusos: 11000,  taxaExcedenteUsd: 0.12 },
];

export const GPT_PRICES = {
  "gpt4o-mini": { input: 0.15, output: 0.60, label: "GPT-4o mini" },
  "gpt4o":      { input: 2.50, output: 10.00, label: "GPT-4o" },
} as const;
export type GptModel = keyof typeof GPT_PRICES;

export function calcMinutos(disparos: number, pctAudio: number, duracaoSeg: number) {
  const audiosMes = disparos * (pctAudio / 100);
  const minutosMes = (audiosMes * duracaoSeg) / 60;
  return { audiosMes, minutosMes };
}

export interface ElevenResult {
  plano: ElevenPlan;
  fixoUsd: number;
  excedenteMin: number;
  excedenteUsd: number;
  totalUsd: number;
  status: "ok" | "warn" | "danger"; // ok = sem excedente, warn = excedente <= 30%, danger = > 30%
}

// Escolhe o plano que minimiza o custo total: testa todos os planos e pega o mais barato.
// Para volumes baixos, plano Creator com excedente pode bater Pro; para volumes altos,
// vale a pena subir para reduzir taxa de excedente.
export function calcElevenLabs(minutosMes: number): ElevenResult {
  let best: ElevenResult | null = null;
  for (const plano of ELEVEN_PLANS) {
    const excMin = Math.max(0, minutosMes - plano.minutosInclusos);
    const excUsd = excMin * plano.taxaExcedenteUsd;
    const total = plano.fixoUsd + excUsd;
    const pctExc = plano.minutosInclusos > 0 ? excMin / plano.minutosInclusos : 0;
    const status: ElevenResult["status"] =
      excMin === 0 ? "ok" : pctExc <= 0.30 ? "warn" : "danger";
    const candidate: ElevenResult = {
      plano,
      fixoUsd: plano.fixoUsd,
      excedenteMin: excMin,
      excedenteUsd: excUsd,
      totalUsd: total,
      status,
    };
    if (!best || candidate.totalUsd < best.totalUsd) best = candidate;
  }
  return best!;
}

export function calcPlayht(minutosMes: number) {
  const charsMes = minutosMes * 375;
  const totalUsd = (charsMes / 1000) * 0.020;
  return { charsMes, totalUsd };
}

export function calcPolly(minutosMes: number) {
  const charsMes = minutosMes * 375;
  const totalUsd = (charsMes / 1_000_000) * 19.20;
  return { charsMes, totalUsd };
}

export function calcGpt(disparos: number, pctAudio: number, tokensPorMsg: number, modelo: GptModel) {
  const textosMes = disparos * (1 - pctAudio / 100);
  const tokensMes = textosMes * tokensPorMsg;
  const tokensInput = tokensMes * 0.5;
  const tokensOutput = tokensMes * 0.5;
  const p = GPT_PRICES[modelo];
  const totalUsd =
    (tokensInput / 1_000_000) * p.input +
    (tokensOutput / 1_000_000) * p.output;
  return { textosMes, tokensMes, totalUsd };
}

export function calcVenda(custoTotalMes: number, setup: number, margem = 0.40) {
  const precoVenda = custoTotalMes / (1 - margem);
  const lucroMes = precoVenda - custoTotalMes;
  const margemPct = precoVenda > 0 ? (lucroMes / precoVenda) * 100 : 0;
  const faturamentoAnual = precoVenda * 12 + setup;
  return { precoVenda, lucroMes, margemPct, faturamentoAnual };
}

export interface PlanoOferta {
  nome: string;
  preco: number;
  setup: number;
  features: string[];
  destaque: boolean;
}

export function calcPlanos(precoVenda: number, setup: number): PlanoOferta[] {
  return [
    {
      nome: "Starter",
      preco: precoVenda * 0.85,
      setup: setup * 0.8,
      features: [
        "Até o volume contratado",
        "Áudio + texto via WhatsApp",
        "Suporte em horário comercial",
        "Relatório mensal básico",
      ],
      destaque: false,
    },
    {
      nome: "Pro",
      preco: precoVenda,
      setup,
      features: [
        "Volume contratado + 20% de folga",
        "Áudio + texto via WhatsApp",
        "Suporte estendido",
        "Dashboard de entregas",
        "Ajustes de fluxo trimestrais",
      ],
      destaque: true,
    },
    {
      nome: "Premium",
      preco: precoVenda * 1.28,
      setup: setup * 1.4,
      features: [
        "Volume ilimitado dentro do plano",
        "Áudio + texto via WhatsApp",
        "Suporte 24h com SLA",
        "Dashboard avançado em tempo real",
        "Ajustes mensais e A/B testing",
        "Gerente de conta dedicado",
      ],
      destaque: false,
    },
  ];
}

export function calcAnual(custoMes: number, precoVendaMes: number, setup: number) {
  const meses = [];
  let custoAcum = 0;
  let receitaAcum = 0;
  let lucroAcum = 0;
  for (let i = 1; i <= 12; i++) {
    const custo = i === 1 ? custoMes + setup : custoMes;
    const receita = i === 1 ? precoVendaMes + setup : precoVendaMes;
    const lucro = receita - custo;
    custoAcum += custo;
    receitaAcum += receita;
    lucroAcum += lucro;
    meses.push({ mes: i, custo, receita, lucro, custoAcum, receitaAcum, lucroAcum });
  }
  return meses;
}

export const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export const fmtUSD = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtNum = (n: number, dec = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
