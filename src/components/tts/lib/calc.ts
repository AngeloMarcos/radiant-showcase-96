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

// ============= ESCALA POR NÚMERO =============
// Modo proporcional: tudo é derivado da quantidade de números ativos.
export interface EscalaPorNumeroInput {
  quantidadeNumeros: number;
  disparosPorNumero: number;     // disparos/mês por número
  audiosPorNumero: number;       // dos disparos, quantos são áudio (resto é texto)
  duracaoMediaSeg: number;
  tokensPorMsg: number;
  custoInfraPorNumero: number;   // BRL/número (infra, gateway, etc.)
}

export interface EscalaPorNumeroResult {
  disparosTotais: number;
  audiosTotais: number;
  textosTotais: number;
  minutosTotaisAudio: number;
  tokensTotaisTexto: number;
  pctAudioDerivado: number;      // % derivado para a UI manual mostrar
  custoInfraTotalBrl: number;
  explicacao: string;
}

export function calcEscalaPorNumero(i: EscalaPorNumeroInput): EscalaPorNumeroResult {
  const q = Math.max(0, i.quantidadeNumeros);
  const dpn = Math.max(0, i.disparosPorNumero);
  const apn = Math.min(Math.max(0, i.audiosPorNumero), dpn); // áudios não excedem disparos
  const disparosTotais = q * dpn;
  const audiosTotais = q * apn;
  const textosTotais = Math.max(0, disparosTotais - audiosTotais);
  const minutosTotaisAudio = (audiosTotais * Math.max(0, i.duracaoMediaSeg)) / 60;
  const tokensTotaisTexto = textosTotais * Math.max(0, i.tokensPorMsg);
  const pctAudioDerivado = dpn > 0 ? (apn / dpn) * 100 : 0;
  const custoInfraTotalBrl = q * Math.max(0, i.custoInfraPorNumero);

  const explicacao =
    `${q} números × ${dpn} disparos = ${disparosTotais.toLocaleString("pt-BR")} disparos/mês · ` +
    `${q} × ${apn} áudios = ${audiosTotais.toLocaleString("pt-BR")} áudios ` +
    `(${pctAudioDerivado.toFixed(0)}%) · ` +
    `${minutosTotaisAudio.toFixed(1)} min de áudio.`;

  return {
    disparosTotais,
    audiosTotais,
    textosTotais,
    minutosTotaisAudio,
    tokensTotaisTexto,
    pctAudioDerivado,
    custoInfraTotalBrl,
    explicacao,
  };
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
  // Texto explicando POR QUE este plano foi recomendado.
  motivoRecomendacao: string;
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
// REGRA: 1) Se houver planos que COBREM o volume sem excedente, escolhe o de
// MENOR PREÇO FIXO entre eles. 2) Caso contrário, escolhe o de MENOR CUSTO
// TOTAL (fixo + excedente) — nunca recomenda um plano com excedente quando
// existe outro sem excedente mais barato no total.
export function calcElevenLabs(
  minutosMes: number,
  qualidade: AudioQuality = "good",
): ElevenResult {
  const elegiveis = ELEVEN_PLANS.filter(p => p.qualidades.includes(qualidade));
  const comparativo = elegiveis.map(p => avaliarPlano(p, minutosMes));

  const cobrem = comparativo.filter(r => r.cobre);
  let recomendado: ElevenPlanResult;
  let motivoRecomendacao: string;

  if (cobrem.length > 0) {
    // Mais barato (preço fixo) entre os que cobrem sem excedente.
    recomendado = cobrem.reduce((a, b) => (a.precoPlanoUsd <= b.precoPlanoUsd ? a : b));
    motivoRecomendacao =
      `Cobre ${minutosMes.toFixed(1)} min com ${recomendado.minutosInclusos} min inclusos ` +
      `pelo menor preço fixo entre os planos compatíveis ($${recomendado.precoPlanoUsd}/mês).`;
  } else {
    // Nenhum cobre — escolhe menor custo total (fixo + excedente).
    recomendado = comparativo.reduce((a, b) => (a.totalUsd <= b.totalUsd ? a : b));
    motivoRecomendacao =
      `Nenhum plano cobre ${minutosMes.toFixed(1)} min sem excedente. ` +
      `${recomendado.plano.nome} tem o menor custo total: $${recomendado.precoPlanoUsd} fixo + ` +
      `$${recomendado.excedenteUsd.toFixed(2)} excedente (${recomendado.excedenteMin.toFixed(1)} min) ` +
      `= $${recomendado.totalUsd.toFixed(2)}/mês.`;
  }

  return {
    ...recomendado,
    fixoUsd: recomendado.plano.fixoUsd,
    comparativo,
    motivoRecomendacao,
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

// ============= REGRAS DE MARGEM E SEGURANÇA =============
// Margem mínima obrigatória — abaixo disso, dispara alerta visual.
export const MARGEM_MINIMA_OBRIGATORIA = 0.35;          // 35%
export const MARGEM_PADRAO              = 0.40;          // alvo de operação
export const MARGEM_PROFISSIONAL        = 0.45;          // alvo do plano âncora
export const MARGEM_PREMIUM             = 0.55;          // alvo do plano premium
export const PRECO_MIN_POR_NUMERO       = 280;           // piso comercial / nº ativo

// Garante margem mínima ao calcular preço final.
export function aplicarPisoMargem(custoTotalMes: number, precoSugerido: number, margemMin = MARGEM_MINIMA_OBRIGATORIA): number {
  const precoMin = custoTotalMes / (1 - margemMin);
  return Math.max(precoSugerido, precoMin);
}

export type PlanoTier = "essencial" | "profissional" | "premium";

export interface PlanoOferta {
  id: PlanoTier;
  nome: string;
  preco: number;
  setup: number;
  features: string[];
  destaque: boolean;
  badge?: string;
  subtitulo: string;
  margemAlvo: number;          // 0..1
  margemReal: number;          // calculada
  lucroMes: number;
  capacidadeDisparos: number;  // capacidade sugerida no plano
  qualidadeAudio: AudioQuality;
  sla: string;
  acompanhamento: string;
  prioridade: string;
  recomendadoPara: string;
}

// Gera os 3 planos comerciais a partir do custo base.
// Estrutura âncora: Essencial (entrada), Profissional (recomendado), Premium (âncora alta).
export function calcPlanos(
  custoTotalMes: number,
  setup: number,
  capacidadeBaseDisparos: number,
): PlanoOferta[] {
  const mk = (tier: PlanoTier, margem: number, multSetup: number, multCapac: number): PlanoOferta => {
    const precoBruto = custoTotalMes / (1 - margem);
    const preco = aplicarPisoMargem(custoTotalMes, precoBruto);
    const lucroMes = preco - custoTotalMes;
    const margemReal = preco > 0 ? lucroMes / preco : 0;
    const capacidade = Math.round(capacidadeBaseDisparos * multCapac);
    const setupPlano = Math.round(setup * multSetup);

    if (tier === "essencial") {
      return {
        id: "essencial", nome: "Essencial",
        subtitulo: "Operação inicial enxuta",
        preco, setup: setupPlano, lucroMes, margemReal,
        margemAlvo: margem, capacidadeDisparos: capacidade,
        qualidadeAudio: "good",
        sla: "Resposta em até 24h úteis",
        acompanhamento: "Relatório mensal",
        prioridade: "Padrão",
        recomendadoPara: "Início de operação · até 10 números",
        destaque: false,
        features: [
          "Áudio em qualidade WhatsApp (Bom)",
          `Capacidade até ${capacidade.toLocaleString("pt-BR")} disparos/mês`,
          "Mão de obra em horário comercial",
          "Suporte por WhatsApp · resposta em 24h",
          "Relatório mensal de entregas",
        ],
      };
    }

    if (tier === "profissional") {
      return {
        id: "profissional", nome: "Profissional",
        subtitulo: "O melhor custo-benefício",
        preco, setup: setupPlano, lucroMes, margemReal,
        margemAlvo: margem, capacidadeDisparos: capacidade,
        qualidadeAudio: "professional",
        sla: "Resposta em até 4h úteis · ajustes em 24h",
        acompanhamento: "Acompanhamento semanal + dashboard",
        prioridade: "Alta",
        recomendadoPara: "Campanhas políticas · 30+ números",
        destaque: true,
        badge: "Mais escolhido",
        features: [
          "Áudio profissional (192 kbps · voice cloning)",
          `Capacidade até ${capacidade.toLocaleString("pt-BR")} disparos/mês`,
          "Mão de obra dedicada · ajustes semanais",
          "Suporte estendido · resposta em até 4h",
          "Dashboard de entregas em tempo real",
          "Otimização contínua de prompts e voz",
          "A/B testing de áudios",
        ],
      };
    }

    return {
      id: "premium", nome: "Premium",
      subtitulo: "Operação assistida total",
      preco, setup: setupPlano, lucroMes, margemReal,
      margemAlvo: margem, capacidadeDisparos: capacidade,
      qualidadeAudio: "studio",
      sla: "SLA 1h · ajustes em tempo real",
      acompanhamento: "Gerente de conta dedicado · daily",
      prioridade: "Máxima",
      recomendadoPara: "Operação enterprise · 50+ números",
      destaque: false,
      badge: "Para quem quer o máximo",
      features: [
        "Áudio estúdio (44.1kHz PCM)",
        `Capacidade até ${capacidade.toLocaleString("pt-BR")} disparos/mês`,
        "Gerente de conta dedicado",
        "Suporte 24h com SLA garantido",
        "Dashboard avançado + alertas",
        "A/B testing automatizado",
        "Reuniões semanais de performance",
        "Prioridade máxima na fila de produção",
      ],
    };
  };

  return [
    mk("essencial",    0.40, 0.85, 1.00),
    mk("profissional", MARGEM_PROFISSIONAL, 1.00, 1.20),
    mk("premium",      MARGEM_PREMIUM,     1.40, 2.00),
  ];
}

// ============= SENSIBILIDADE POR QUANTIDADE DE NÚMEROS =============
// Recalcula tudo para uma dada qtd de números, mantendo os mesmos parâmetros base.
export interface SensibilidadeInput {
  quantidadesNumeros: number[];
  disparosPorNumero: number;
  audiosPorNumero: number;
  duracaoSeg: number;
  tokensPorMsg: number;
  modeloGpt: GptModel;
  qualidade: AudioQuality;
  custoInfraPorNumero: number;
  moPlanoId: MoPlanoId;
  cambio: number;
  setup: number;
  margem?: number;
}

export interface SensibilidadePonto {
  numeros: number;
  disparos: number;
  minutosAudio: number;
  custoTotalBrl: number;
  precoVendaBrl: number;
  lucroMes: number;
  custoPorNumero: number;
  custoPorDisparo: number;
}

export function calcSensibilidadePorNumero(i: SensibilidadeInput): SensibilidadePonto[] {
  const margem = i.margem ?? MARGEM_PADRAO;
  return i.quantidadesNumeros.map(q => {
    const escala = calcEscalaPorNumero({
      quantidadeNumeros: q,
      disparosPorNumero: i.disparosPorNumero,
      audiosPorNumero: i.audiosPorNumero,
      duracaoMediaSeg: i.duracaoSeg,
      tokensPorMsg: i.tokensPorMsg,
      custoInfraPorNumero: i.custoInfraPorNumero,
    });
    const eleven = calcElevenLabs(escala.minutosTotaisAudio, i.qualidade);
    const gpt = calcGpt(escala.disparosTotais, escala.pctAudioDerivado, i.tokensPorMsg, i.modeloGpt);
    const custoApiBrl = (eleven.totalUsd + gpt.totalUsd) * i.cambio;
    const custoMo = calcularMaoDeObraPorNumero(q, i.moPlanoId);
    const custoTotal = custoApiBrl + escala.custoInfraTotalBrl + custoMo;
    const venda = calcVenda(custoTotal, i.setup, margem);
    const precoFinal = aplicarPisoMargem(custoTotal, venda.precoVenda);
    const lucro = precoFinal - custoTotal;
    return {
      numeros: q,
      disparos: escala.disparosTotais,
      minutosAudio: escala.minutosTotaisAudio,
      custoTotalBrl: custoTotal,
      precoVendaBrl: precoFinal,
      lucroMes: lucro,
      custoPorNumero: q > 0 ? custoTotal / q : 0,
      custoPorDisparo: escala.disparosTotais > 0 ? custoTotal / escala.disparosTotais : 0,
    };
  });
}
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
    const numeros = Math.max(1, Math.round(lerp(input.numerosInicial, input.numerosFinal, t)));

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
    const custoMoBrl = calcularMaoDeObraPorNumero(numeros, input.moPlanoId);
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
      numeros,
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
