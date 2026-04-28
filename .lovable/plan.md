# Reformulação da Mão de Obra: precificação por número de WhatsApp

Substituir o modelo atual de MO (`moBase` fixo + `pctMo` sobre técnico) por um modelo **por número de WhatsApp ativo**, com 3 planos comerciais e comparativo contra a precificação atual de R$ 100/número.

## 1. Engine de cálculo (`src/components/tts/lib/calc.ts`)

Adicionar no topo do arquivo:

```ts
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
  precoPorNumero: number;
  descricao: string;
  inclui: string[];
}

export const MO_PLANOS: Record<MoPlanoId, MoPlano> = {
  basico:  { id: "basico",  nome: "Básico (mínimo viável)",     precoPorNumero: 150, descricao: "Operação enxuta", inclui: ["Setup inicial", "Monitoramento básico", "Suporte horário comercial"] },
  padrao:  { id: "padrao",  nome: "Padrão (recomendado)",       precoPorNumero: 220, descricao: "Acompanhamento ativo", inclui: ["Setup completo", "Ajustes semanais de fluxo", "Monitoramento diário", "Suporte estendido", "Otimização de prompts"] },
  premium: { id: "premium", nome: "Premium (máximo acompanhamento)", precoPorNumero: 320, descricao: "Operação assistida", inclui: ["Setup premium", "Ajustes contínuos", "Monitoramento em tempo real", "Suporte 24h durante campanha", "A/B de áudios e textos", "Gerente dedicado"] },
};

export function calcularMaoDeObraPorNumero(quantidadeNumeros: number, plano: MoPlanoId): number {
  const preco = Math.max(MO_PLANOS[plano].precoPorNumero, MO_PRECO_MINIMO_POR_NUMERO);
  return Math.max(0, quantidadeNumeros) * preco;
}

export function calcularPercentualMaoDeObra(custoTecnico: number, maoDeObra: number): number {
  const total = custoTecnico + maoDeObra;
  return total > 0 ? (maoDeObra / total) * 100 : 0;
}
```

## 2. Estado e cálculo (`Calculator.tsx`)

Substituir os estados `moBase` e `pctMo` por:

```ts
const [quantidadeNumeros, setQuantidadeNumeros] = useState(30);
const [moPlanoId, setMoPlanoId] = useState<MoPlanoId>("padrao");
```

No `useMemo` do `calc`, trocar o bloco de mão de obra por:

```ts
const custoMoBrl = calcularMaoDeObraPorNumero(quantidadeNumeros, moPlanoId);
const custoMoLegadoBrl = quantidadeNumeros * MO_PRECO_LEGADO_POR_NUMERO;
const pctMoNoTotal = calcularPercentualMaoDeObra(custoTecnicoBrl, custoMoBrl);

// Totais por plano (para o comparativo na UI)
const moPorPlano = {
  basico:  calcularMaoDeObraPorNumero(quantidadeNumeros, "basico"),
  padrao:  calcularMaoDeObraPorNumero(quantidadeNumeros, "padrao"),
  premium: calcularMaoDeObraPorNumero(quantidadeNumeros, "premium"),
};
```

`custoTotalMes` e `custoPorNumero = custoTotalMes / quantidadeNumeros` continuam derivando normalmente.

## 3. UI

**A. No painel "Configuração base"**: trocar os dois sliders antigos (`MO base` e `% MO sobre técnico`) por:
- Slider/input `Quantidade de números WhatsApp` (min 1, default 30).

**B. Nova seção dedicada "Mão de Obra"**, posicionada logo após a seção "Áudio ElevenLabs":

- **Seletor de plano** (3 cards lado a lado): Básico / Padrão / Premium, mostrando preço por número, total para a quantidade informada, lista do que inclui, e destaque no plano selecionado.
- **Card de impacto** ao lado: total da MO escolhida em BRL, % que representa do custo total, e custo final por número.
- **Comparativo** (banner destacado):
  - "Cobrando R$ 100/número (atual): R$ X (total da operação)"
  - "Com plano {selecionado}: R$ Y"
  - "Diferença: +R$ Z (+W%)" — verde se aumento, com texto "subprecificação corrigida".
- Texto fino explicando: "Inclui setup, ajustes de fluxo, monitoramento, suporte durante a campanha e otimização."

**C. Tabela de comparação rápida** (3 linhas, uma por plano), mostrando para a quantidade atual de números:
| Plano | R$/número | Total MO/mês | % do custo total |

## 4. Limpeza

- Remover `moBase`/`pctMo` do estado, do `resetar()`, do `salvarSimulacao()`/`carregarSimulacao()` e do tipo `SimulacaoSalva` (substituir por `quantidadeNumeros` + `moPlanoId`).
- No `breakdown`, substituir as duas linhas de MO por uma única: `Mão de obra · {plano.nome} ({quantidadeNumeros} números × R$ {preco})`.
- O `RampInput` (ramp-up) hoje usa `moBase` + `pctMoInicial/Final`. Migrar para `quantidadeNumerosInicial/Final` + `moPlanoId` constante, recalculando MO por número em cada mês do ramp.
- Atualizar `gerarTextoProposta` para mencionar o plano de MO escolhido e a quantidade de números.

## 5. Detalhes técnicos

- Constantes ficam no topo do `calc.ts` (linha bem visível, acima de `ELEVEN_PLANS`), fáceis de ajustar.
- `calcularMaoDeObraPorNumero` aplica o piso `MO_PRECO_MINIMO_POR_NUMERO` defensivamente (mesmo se alguém editar `MO_PLANOS.basico.precoPorNumero` para menos de 150, o cálculo respeita o mínimo).
- O comparativo usa `MO_PRECO_LEGADO_POR_NUMERO = 100` como referência histórica fixa.
- A UI dos cards de plano segue o padrão visual existente (`tts-card` + `!border-[var(--tts-orange)]` para o selecionado), reaproveitando o componente `Row`.

## Entregáveis finais

1. `calc.ts`: constantes `MO_PRECO_MINIMO_POR_NUMERO`, `MO_PRECO_LEGADO_POR_NUMERO`, `MO_PLANOS`, e funções `calcularMaoDeObraPorNumero` e `calcularPercentualMaoDeObra`.
2. `Calculator.tsx`: estado `quantidadeNumeros` + `moPlanoId`, seção de UI com seletor de plano, totais e comparativo legado vs novo.
3. Migração coerente em ramp-up, histórico, breakdown e proposta.
