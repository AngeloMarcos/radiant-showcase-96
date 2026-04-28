# TTS Cost Calculator — Plano de Construção

Calculadora interativa, single-page, 100% client-side, para precificar soluções de disparo WhatsApp com áudio (ElevenLabs / Play.ht / Polly) + texto (GPT) + mão de obra. Tema dark navy com acentos laranja/ciano, tudo recalcula em tempo real.

## Rota e estrutura

- Substituir o conteúdo de `src/routes/index.tsx` (atualmente landing MentoArk) pela nova calculadora. A landing antiga e os componentes em `src/components/mentoark/` serão removidos para evitar arquivos órfãos.
- `head()` da rota: title "TTS Cost Calculator", description em PT-BR.
- Novo namespace de componentes: `src/components/tts/`.

## Componentes (todos em `src/components/tts/`)

- `Calculator.tsx` — container raiz, dono do estado e dos `useMemo` de cálculo. Passa props derivadas para os filhos.
- `ConfigPanel.tsx` — Seção 1 (disparos, MO, câmbio, setup) com sliders shadcn + inputs numéricos.
- `ToolSelector.tsx` — Seção 2 (tabs para áudio: ElevenLabs / Play.ht / Polly / Comparar; toggle GPT-4o mini vs GPT-4o; input tokens).
- `Results.tsx` — Seção 4, 7 cards grandes (custo API USD/BRL, MO, total/mês, 1º mês, preço venda, lucro, faturamento anual) com transição suave nos números.
- `Breakdown.tsx` — Seção 5, tabela detalhada (item, USD, BRL, % do total) com subtotais.
- `ComparisonChart.tsx` — Seção 6, Recharts BarChart empilhado (áudio + texto + MO) para as 3 ferramentas lado a lado.
- `Scenarios.tsx` — Seção 7, 4 botões de cenário; clicar aplica os valores ao estado (Pro destacado como "Recomendado").
- `Proposal.tsx` — Seção 8, gera 3 planos (Starter/Pro/Premium) com features, badge "Recomendado" no Pro, botão "Copiar Proposta" usando `navigator.clipboard`.
- `AnnualTable.tsx` — Seção 9, toggle expansível com 12 meses + acumulados.
- `Alerts.tsx` — Seção de alertas contextuais (excedente alto, MO > APIs, margem baixa, Play.ht muito mais barato) com cores semânticas.
- `ui/` — `StatCard`, `SliderInput` (slider + número editável sincronizados), `Badge` reaproveitado do shadcn.

## Lógica de cálculo (`src/components/tts/lib/calc.ts`)

Funções puras, fáceis de testar e memorizáveis:

- `calcMinutos(disparos, pctAudio, duracaoSeg)` → `{ audiosMes, minutosMes }`.
- `calcElevenLabs(minutosMes)` — escolhe o plano de menor custo total testando os 4 (Creator/Pro/Scale/Business). Retorna `{ plano, fixo, excedenteMin, excedenteCusto, total, status: 'ok'|'warn'|'danger' }`. Comentários no código explicam a heurística de escolha.
- `calcPlayht(minutosMes)` — `chars = min × 375`, `(chars/1000) × 0.020`.
- `calcPolly(minutosMes)` — `(chars/1_000_000) × 19.20`.
- `calcGpt(disparos, pctAudio, tokensPorMsg, modelo)` — split 50/50 input/output, preços por modelo.
- `calcTotais(...)` — agrega API USD, converte BRL, soma MO, calcula 1º mês com setup.
- `calcVenda(custoTotal, margem = 0.40)` → `{ precoVenda, lucroMes, margemPct, faturamentoAnual }`.
- `calcPlanos(precoVenda)` → Starter (×0.85), Pro (×1.0), Premium (×1.28).
- `calcAnual(custoMes, precoVenda, setup)` → array de 12 meses com acumulados.

Tudo envolto em um único `useMemo` no `Calculator` para recálculo instantâneo.

## Estado (em `Calculator.tsx`)

```ts
{
  totalDisparos: 5000,
  pctAudio: 30,
  duracaoSeg: 10,
  moBase: 2500,
  pctMo: 40,
  cambio: 5.80,
  setup: 4500,
  ferramentaAudio: 'elevenlabs' | 'playht' | 'polly' | 'comparar',
  modeloGpt: 'gpt4o-mini' | 'gpt4o',
  tokensPorMsg: 200,
  mostrarAnual: false,
}
```

`pctTexto` é derivado (`100 - pctAudio`).

## Identidade visual

- Adicionar fontes Google (`Bricolage Grotesque` 700/800, `DM Mono` 400/500) e tokens de cor (navy/laranja/ciano/verde/vermelho/dourado) em `src/styles.css`, escopados com a classe raiz `.tts-app` para não poluir o resto do design system.
- Grid de fundo sutil com `background-image` de linhas finas; cards com border 1px e radius pequeno; números sempre em DM Mono.
- Badges coloridos para status do plano ElevenLabs (verde/amarelo/vermelho) e para "Recomendado".
- Layout responsivo: grid 1 col mobile, 2 col tablet, 3 col desktop nos cards de resultado; sliders touch-friendly.
- Formatação: BRL via `toLocaleString('pt-BR', { style:'currency', currency:'BRL' })`; USD via `$X,XX`.

## Dependências

- `recharts` — verificar `package.json`; instalar via `bun add recharts` se ausente.
- shadcn (`Slider`, `Tabs`, `Card`, `Button`, `Input`, `Badge`, `Switch`) — todos já presentes.
- `lucide-react` — já presente.

## Limpeza

- Deletar `src/components/mentoark/` (10+ arquivos da landing antiga) e `.lovable/plan.md`, já que a página inicial passa a ser a calculadora.

## Comportamento e UX

- Todos os inputs sincronizados (slider ↔ número).
- Mudar % áudio atualiza % texto automaticamente (campo readonly).
- Cenários animam os sliders para os novos valores (transição CSS sobre o valor numérico exibido).
- Gráfico comparativo sempre mostra as 3 ferramentas, independente da seleção.
- Banners de alerta aparecem condicionalmente conforme as regras descritas.
- Botão "Copiar Proposta" mostra confirmação visual ("Copiado!") por 2s.

Aprove para eu construir.