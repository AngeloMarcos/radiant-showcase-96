## Modo "Condição especial de campanha" — pagamento diferido

Adiciona uma nova seção comercial à calculadora para fechar com candidatos sem caixa imediato, sem que você opere no prejuízo. A lógica isola o **custo técnico** (que sempre precisa estar coberto na entrada) da **mão de obra**, que pode ser parcelada em "agora" + "depois".

---

### 1. Novos estados (em `Calculator.tsx`)

```ts
const [modoCampanha, setModoCampanha]       = useState(false);
const [pctEntradaMO, setPctEntradaMO]       = useState(50); // % da MO paga agora
const [reservaMinima, setReservaMinima]     = useState(0);  // BRL — folga sobre custo técnico
const [presetCampanha, setPresetCampanha]   = useState<"30/70"|"40/60"|"50/50"|"60/40"|"custom"|null>("50/50");
```

### 2. Novas fórmulas (em `lib/calc.ts` — função `calcCondicaoCampanha`)

```ts
// Composição já existente
custoTecnicoTotal   = custoApiBrl + custoInfraBrl       // GPT + Áudio + Infra
maoDeObraTotal      = custoMoBrl                         // por nº × plano
margemBrl           = precoVenda - (custoTecnicoTotal + maoDeObraTotal)
precoTotal          = custoTecnicoTotal + maoDeObraTotal + margemBrl

// Divisão temporal
entradaMaoDeObra    = maoDeObraTotal * (pctEntradaMO / 100)
saldoMaoDeObra      = maoDeObraTotal - entradaMaoDeObra

valorPagoAgora      = custoTecnicoTotal + entradaMaoDeObra + margemBrl
valorPagoDepois     = saldoMaoDeObra

percentualPagoAgora = valorPagoAgora  / precoTotal * 100
percentualPagoDepois= valorPagoDepois / precoTotal * 100

// Travas
coberturaTecnica    = valorPagoAgora - custoTecnicoTotal           // sobra sobre custo técnico
coberturaComReserva = valorPagoAgora - custoTecnicoTotal - reservaMinima
risco               = coberturaTecnica < 0 ? "alto"
                    : coberturaComReserva < 0 ? "medio"
                    : "ok"
```

A margem fica embutida no `valorPagoAgora` por padrão (você não financia seu próprio lucro), mas o componente também expõe `cenariosComparativos` para 30/40/50/60% para o gráfico C.

### 3. UI — nova seção "Condição comercial para início imediato"

Posicionada **logo após os 3 planos comerciais**, antes do histórico:

```text
┌───────────────────────────────────────────────────────────────┐
│ [✓] Modo campanha (pagamento diferido)        [50/50] ativo  │
├───────────────────────────────────────────────────────────────┤
│ Quanto da mão de obra entra agora?                            │
│ [30/70]  [40/60]  [50/50*]  [60/40]   custom: [__]%           │
│                                                               │
│ Reserva mínima de caixa: R$ [____]                            │
├───────────────────────────────────────────────────────────────┤
│  ┌─ AGORA ──────────┐   ┌─ DEPOIS ─────────┐                 │
│  │ R$ X.XXX         │   │ R$ X.XXX         │                 │
│  │ XX% do total     │   │ XX% do total     │                 │
│  │ ✓ Custos cobertos│   │ Saldo programado │                 │
│  └──────────────────┘   └──────────────────┘                 │
│                                                               │
│  [Bar empilhada]    [Donut % ]    [Comparativo cenários]     │
└───────────────────────────────────────────────────────────────┘
```

Frases dinâmicas conforme o estado:
- "Entrada reduzida para começar agora"
- "Saldo programado para quando liberar a verba"
- "Custos técnicos protegidos · você recebe R$ X acima do custo"
- "Você paga {pctAgora}% agora e {pctDepois}% depois"

### 4. Travas anti-prejuízo

- **Banner vermelho** quando `valorPagoAgora < custoTecnicoTotal`: "Risco alto — entrada não cobre os custos técnicos. Suba para no mínimo X% da mão de obra."
- **Banner amarelo** quando entrada cobre técnico mas não a reserva: "Atenção — entrada cobre custos mas sem folga de caixa."
- **Banner verde** quando OK: "Operação segura · folga de R$ X sobre o custo técnico."
- Bloqueio: o slider customizado tem um botão "**Entrada mínima segura**" que calcula automaticamente o `pctEntradaMO` que zera o risco.

### 5. Gráficos (Recharts — já instalado)

- **A. BarChart empilhada** (1 barra única): Custo Técnico (verde) + MO Agora (laranja) + MO Depois (cinza tracejado).
- **B. PieChart donut**: Pago Agora vs. Pago Depois (% no centro).
- **C. BarChart comparativo**: 4 barras (30/40/50/60%) mostrando `valorPagoAgora` em cada cenário, com linha de referência marcando o `custoTecnicoTotal + reservaMinima`.

### 6. Resumo final (substitui/complementa o "Resumo comercial")

Quando `modoCampanha = true`, o resumo passa a mostrar:
- Quantidade de números · Custo técnico · Mão de obra total
- **Valor de entrada (agora)** e **Valor futuro (depois)** em destaque
- % agora / % depois
- Status de risco (verde/amarelo/vermelho)

### 7. Integração com proposta (WhatsApp e PDF)

`gerarTextoProposta` ganha um bloco condicional quando `modoCampanha` está ativo:

```
💡 Condição especial de campanha:
   Entrada hoje: R$ X.XXX (XX%)
   Saldo na liberação da verba: R$ X.XXX (XX%)
```

O mesmo aparece no PDF.

### 8. Reatividade

Tudo passa por `useMemo` dependente de: `quantidadeNumeros`, `moPlanoId`, `modeloGpt`, `ferramentaAudio`, `qualidade`, `duracaoSeg`, `pctEntradaMO`, `reservaMinima`, `cambio`. Mudar qualquer slider recalcula entrada, saldo, gráficos e status de risco em tempo real.

---

### Arquivos alterados

- `src/components/tts/lib/calc.ts` — nova função `calcCondicaoCampanha` + `calcCenariosCampanha` (para o gráfico C).
- `src/components/tts/Calculator.tsx` — novos estados, seção "Condição comercial para início imediato", 3 gráficos, integração com proposta WhatsApp/PDF.
- `src/components/tts/PresentationMode.tsx` — slide extra "Condição especial" exibido apenas quando `modoCampanha` está ativo.

Sem alteração de schema, sem dependências novas.