// Engine de cálculo da TTS Cost Calculator. Funções puras.
//
// === Planos ElevenLabs (valores aproximados, USD/mês) ===
// - Starter:  $5   · ~30k credits  · ~60 min de áudio   · 128 kbps (uso casual)
// - Creator:  $22  · ~100k credits · ~200 min de áudio  · 192 kbps + voice cloning
// - Pro:      $99  · ~500k credits · ~1.000 min         · 44.1kHz PCM via API
// - Scale:    $330 · ~2M credits   · ~4.000 min         · alto volume / produção
// - Business: $1320 · ~11M credits · ~11.000+ min       · enterprise
// Conversão usada: ~500 credits por minuto de áudio (multilingual v2).
// Excedente cobrado a uma taxa base por minuto (ajustável).

export type ElevenPlanId = "starter" | "creator" | "pro" | "scale" | "business";
export type AudioQuality = "good" | "professional" | "studio";

export interface ElevenPlan {
  id: ElevenPlanId;
  nome: string;
  fixoUsd: number;
  minutosInclusos: number;
  taxaExcedenteUsd: number;     // USD por minuto excedente
  qualidadeLabel: string;       // descrição amigável (kbps / formato)
  qualidades: AudioQuality[];   // níveis de qualidade que este plano atende
}

// Taxa base de excedente por minuto (estimada). Pode ser ajustada conforme
// o consumo real de credits da sua conta.
export const ELEVEN_OVERAGE_USD_PER_MIN = 0.20;

export const ELEVEN_PLANS: ElevenPlan[] = [
  { id: "starter",  nome: "Starter",  fixoUsd: 5,    minutosInclusos: 60,     taxaExcedenteUsd: ELEVEN_OVERAGE_USD_PER_MIN, qualidadeLabel: "128 kbps · uso casual",         qualidades: ["good"] },
  { id: "creator",  nome: "Creator",  fixoUsd: 22,   minutosInclusos: 200,    taxaExcedenteUsd: ELEVEN_OVERAGE_USD_PER_MIN, qualidadeLabel: "192 kbps · pro voice cloning",  qualidades: ["good", "professional"] },
  { id: "pro",      nome: "Pro",      fixoUsd: 99,   minutosInclusos: 1000,   taxaExcedenteUsd: ELEVEN_OVERAGE_USD_PER_MIN, qualidadeLabel: "44.1kHz PCM via API",            qualidades: ["professional", "studio"] },
  { id: "scale",    nome: "Scale",    fixoUsd: 330,  minutosInclusos: 4000,   taxaExcedenteUsd: ELEVEN_OVERAGE_USD_PER_MIN, qualidadeLabel: "44.1kHz PCM · alto volume",      qualidades: ["studio"] },
  { id: "business", nome: "Business", fixoUsd: 1320, minutosInclusos: 11000,  taxaExcedenteUsd: ELEVEN_OVERAGE_USD_PER_MIN, qualidadeLabel: "Enterprise · SLA",               qualidades: ["studio"] },
];

// ============= MÃO DE OBRA por número de WhatsApp =============
// Subimos mão de obra por número porque R$ 100/numero é subprecificado
// para operação de campanha política com automação, GPT e áudio ElevenLabs.
// O valor inclui: setup, ajustes de fluxo, monitoramento diário,
// suporte durante a campanha e otimização de prompts/voz.
export const MO_PRECO_MINIMO_POR_NUMERO = 150;
export const MO_PRECO_LEGADO_POR_NUMERO = 100; // referência histórica para comparativo

export type MoPlanoId = "basico" | "padrao" | "premium";

export interface MoPlano {
  id: MoPlanoId;
  nome: string;
  rotulo: string;          // texto para botão/seletor
  precoPorNumero: number;
  descricao: string;
  inclui: string[];
}

export const MO_PLANOS: Record<MoPlanoId, MoPlano> = {
  basico: {
    id: "basico",
    nome: "Básico",
    rotulo: "Básico (mínimo viável)",
    precoPorNumero: 150,
    descricao: "Operação enxuta",
    inclui: ["Setup inicial", "Monitoramento básico", "Suporte horário comercial"],
  },
  padrao: {
    id: "padrao",
    nome: "Padrão",
    rotulo: "Padrão (recomendado)",
    precoPorNumero: 220,
    descricao: "Acompanhamento ativo",
    inclui: [
      "Setup completo",
      "Ajustes semanais de fluxo",
      "Monitoramento diário",
      "Suporte estendido",
      "Otimização de prompts",
    ],
  },
  premium: {
    id: "premium",
    nome: "Premium",
    rotulo: "Premium (máximo acompanhamento)",
    precoPorNumero: 320,
    descricao: "Operação assistida",
    inclui: [
      "Setup premium",
      "Ajustes contínuos de fluxo",
      "Monitoramento em tempo real",
      "Suporte 24h durante a campanha",
      "A/B de áudios e textos",
      "Gerente de conta dedicado",
    ],
  },
};

export function calcularMaoDeObraPorNumero(
  quantidadeNumeros: number,
  plano: MoPlanoId,
): number {
  const preco = Math.max(MO_PLANOS[plano].precoPorNumero, MO_PRECO_MINIMO_POR_NUMERO);
  return Math.max(0, quantidadeNumeros) * preco;
}

export function calcularPercentualMaoDeObra(
  custoTecnico: number,
  maoDeObra: number,
): number {
  const total = custoTecnico + maoDeObra;
  return total > 0 ? (maoDeObra / total) * 100 : 0;
}

// ============= GPT =============

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

export interface ElevenPlanResult {
  plano: ElevenPlan;
  minutosNecessarios: number;
  minutosInclusos: number;
  excedenteMin: number;
  precoPlanoUsd: number;
  excedenteUsd: number;
  totalUsd: number;
  cobre: boolean;                // true se inclusos >= necessários
  status: "ok" | "warn" | "danger";
}

export interface ElevenResult extends ElevenPlanResult {
  // Mantém compat com a API antiga (campos usados na UI):
  fixoUsd: number;
  // Lista comparativa de TODOS os planos elegíveis para a qualidade escolhida:
  comparativo: ElevenPlanResult[];
}

function avaliarPlano(plano: ElevenPlan, minutosMes: number): ElevenPlanResult {
  const excMin = Math.max(0, minutosMes - plano.minutosInclusos);
  const excUsd = excMin * plano.taxaExcedenteUsd;
  const total = plano.fixoUsd + excUsd;
  const pctExc = plano.minutosInclusos > 0 ? excMin / plano.minutosInclusos : 0;
  const status: ElevenPlanResult["status"] =
    excMin === 0 ? "ok" : pctExc <= 0.30 ? "warn" : "danger";
  return {
    plano,
    minutosNecessarios: minutosMes,
    minutosInclusos: plano.minutosInclusos,
    excedenteMin: excMin,
    precoPlanoUsd: plano.fixoUsd,
    excedenteUsd: excUsd,
    totalUsd: total,
    cobre: excMin === 0,
    status,
  };
}

// Escolhe o plano mais barato dentre os elegíveis para a qualidade selecionada.
// Estratégia: 1) prefere o plano mais barato que COBRE o volume sem excedente;
// 2) se nenhum cobre, escolhe o de menor custo total (fixo + excedente).
export function calcElevenLabs(
  minutosMes: number,
  qualidade: AudioQuality = "good",
): ElevenResult {
  const elegiveis = ELEVEN_PLANS.filter(p => p.qualidades.includes(qualidade));
  const comparativo = elegiveis.map(p => avaliarPlano(p, minutosMes));

  const cobrem = comparativo.filter(r => r.cobre);
  const recomendado =
    cobrem.length > 0
      ? cobrem.reduce((a, b) => (a.totalUsd <= b.totalUsd ? a : b))
      : comparativo.reduce((a, b) => (a.totalUsd <= b.totalUsd ? a : b));

  return {
    ...recomendado,
    fixoUsd: recomendado.plano.fixoUsd,
    comparativo,
  };
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

// ============= RAMP-UP / Crescimento gradual =============
// Projeção mês a mês com aumento progressivo de volume e de números ativos.

export interface RampInput {
  meses: number;
  disparosInicial: number;
  disparosFinal: number;
  pctAudioInicial: number;
  pctAudioFinal: number;
  duracaoSeg: number;
  tokensPorMsg: number;
  modeloGpt: GptModel;
  ferramenta: "elevenlabs" | "playht" | "polly";
  // Mão de obra por número (ramp-up de números ativos com plano fixo)
  numerosInicial: number;
  numerosFinal: number;
  moPlanoId: MoPlanoId;
  cambio: number;
  setup: number;
  margem?: number;
}

export interface RampMes {
  mes: number;
  disparos: number;
  pctAudio: number;
  numeros: number;
  audiosMes: number;
  minutosMes: number;
  custoAudioBrl: number;
  custoTextoBrl: number;
  custoApiBrl: number;
  custoMoBrl: number;
  custoTotal: number;
  precoVenda: number;
  lucro: number;
  receita: number;
  lucroAcum: number;
  receitaAcum: number;
  custoAcum: number;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function calcRampUp(input: RampInput): RampMes[] {
  const margem = input.margem ?? 0.40;
  const meses: RampMes[] = [];
  let custoAcum = 0;
  let receitaAcum = 0;
  let lucroAcum = 0;

  for (let i = 1; i <= input.meses; i++) {
    const t = input.meses === 1 ? 1 : (i - 1) / (input.meses - 1);
    const disparos = Math.round(lerp(input.disparosInicial, input.disparosFinal, t));
    const pctAudio = lerp(input.pctAudioInicial, input.pctAudioFinal, t);
    const pctMo = lerp(input.pctMoInicial, input.pctMoFinal, t);

    const { audiosMes, minutosMes } = calcMinutos(disparos, pctAudio, input.duracaoSeg);
    const eleven = calcElevenLabs(minutosMes);
    const playht = calcPlayht(minutosMes);
    const polly = calcPolly(minutosMes);
    const gpt = calcGpt(disparos, pctAudio, input.tokensPorMsg, input.modeloGpt);

    const audioUsd =
      input.ferramenta === "elevenlabs" ? eleven.totalUsd :
      input.ferramenta === "playht"     ? playht.totalUsd :
                                          polly.totalUsd;

    const custoAudioBrl = audioUsd * input.cambio;
    const custoTextoBrl = gpt.totalUsd * input.cambio;
    const custoApiBrl = custoAudioBrl + custoTextoBrl;
    const custoMoBrl = input.moBase * (pctMo / 100);
    const custoTotal = custoApiBrl + custoMoBrl;
    const venda = calcVenda(custoTotal, input.setup, margem);

    const custoMes = i === 1 ? custoTotal + input.setup : custoTotal;
    const receitaMes = i === 1 ? venda.precoVenda + input.setup : venda.precoVenda;
    const lucroMes = receitaMes - custoMes;

    custoAcum += custoMes;
    receitaAcum += receitaMes;
    lucroAcum += lucroMes;

    meses.push({
      mes: i,
      disparos,
      pctAudio,
      pctMo,
      audiosMes,
      minutosMes,
      custoAudioBrl,
      custoTextoBrl,
      custoApiBrl,
      custoMoBrl,
      custoTotal,
      precoVenda: venda.precoVenda,
      lucro: lucroMes,
      receita: receitaMes,
      lucroAcum,
      receitaAcum,
      custoAcum,
    });
  }
  return meses;
}

export const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export const fmtUSD = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtNum = (n: number, dec = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
