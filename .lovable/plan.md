## Dashboard executivo estilo Power BI

Adiciona um painel consolidado **no topo da calculadora** (logo após o header, antes da seção de Cenários) com KPIs grandes, texto comercial e 4 gráficos profissionais. Toda a lógica de cálculo já existe — esta entrega é puramente de **apresentação e organização visual**.

---

### 1. KPIs (8 cards no topo)

Grid 2x4 (mobile 2 col / desktop 4 col), separando claramente as duas categorias:

| Categoria | KPIs |
|-----------|------|
| **Tecnologia e consumo** | Custo técnico (APIs+infra), Capacidade (disparos/mês), Quantidade de números |
| **Operação e inteligência** | Meu trabalho (MO total) |
| **Comercial** | Investimento total, Lucro estimado / margem |
| **Pagamento** | Pago AGORA, Pago DEPOIS |

Cada card: label pequeno em mono uppercase, valor grande colorido (verde/laranja/ciano), hint contextual abaixo.

### 2. Bloco de texto persuasivo (2 colunas)

- **"Por que este investimento?"** — explica que API ≠ trabalho. A IA é a ferramenta, o resultado depende de quem opera (estratégia, monitoramento, otimização).
- **"Condição de pré-campanha"** — texto adaptativo: se `modoCampanha` ativo, fala de entrada+saldo; se não, convida a ativar.

### 3. Quatro gráficos (grid 2x2)

| Gráfico | Tipo | Dados |
|---------|------|-------|
| **A. Composição do preço** | Donut (PieChart) | APIs · Infra · Meu trabalho · Margem (filtra zeros, label = %) |
| **B. Divisão do pagamento** | Barras empilhadas | Coluna "Agora" (técnico+MO entrada+margem) e "Depois" (saldo MO) |
| **C. Escala por nº de números** | Linha multi-série | X = [10, 30, 50, 100]; Y = Técnico, Meu trabalho, Preço final |
| **D. Formação do preço** | Cascata (waterfall) | GPT → ElevenLabs → Infra → Meu trabalho → Margem → Total. Implementada com `BarChart` empilhado: barra invisível de base + barra colorida do valor |

### 4. Fórmulas que alimentam cada gráfico

```ts
// Já calculadas em `calc` e `campanha` — apenas referenciadas.
APIs            = calc.custoApiBrl       // GPT + áudio (BRL)
Infra           = calc.custoInfraBrl
Meu trabalho    = calc.custoMoBrl        // por nº × plano MO
Margem          = planoRecomendado.preco - calc.custoTotalMes
Preço total     = planoRecomendado.preco

// Pagamento (via calcCondicaoCampanha)
Agora           = campanha.custoTecnicoTotal
                + (modoCampanha ? campanha.entradaMaoDeObra : campanha.maoDeObraTotal)
                + campanha.margemBrl
Depois          = modoCampanha ? campanha.saldoMaoDeObra : 0

// Escala (via calcSensibilidadePorNumero — já existente)
para cada n ∈ [10, 30, 50, 100]:
  moAprox       = calcularMaoDeObraPorNumero(n, moPlanoId)
  tecnicoAprox  = custoTotalBrl(n) - moAprox
  precoFinal    = precoVendaBrl(n)
```

### 5. Reatividade

Tudo dentro de `useMemo` que já depende de: `quantidadeNumeros`, `pctEntradaMO`, `duracaoSeg`, `disparosEfetivos`, `eleven`, `moPlanoId`. Mudar qualquer slider repinta KPIs e gráficos em tempo real (sem trabalho extra).

### 6. Visual / UX

- Reaproveita `tts-card`, `tts-badge-orange`, `CHART_COLORS` (já consistentes).
- Hierarquia: título grande → KPIs → texto explicativo → grid 2x2 de gráficos.
- Labels curtas em PT-BR ("Tecnologia e consumo", "Operação e inteligência", "Investimento total").
- Sem poluição: cada card tem só label + valor + hint.

### 7. Posicionamento

```text
[Header existente]
↓
[NOVO: Dashboard executivo]   ← inserido aqui
   ├─ 8 KPIs
   ├─ Bloco texto comercial
   └─ Grid 2x2 de gráficos
↓
[Cenários rápidos]            ← seções existentes seguem inalteradas
[Sliders / configs]
[Planos comerciais]
[Condição especial de campanha]
[Histórico]
```

### 8. Entregáveis

- **Componente alterado**: `src/components/tts/Calculator.tsx` (uma única seção nova inserida após `</header>`).
- **Sem mudanças em** `lib/calc.ts`, `PresentationMode.tsx`, `styles.css` ou dependências.
- **Categorias usadas para separar trabalho × API**:
  - *Tecnologia e consumo* = `custoApiBrl + custoInfraBrl` (GPT + ElevenLabs/Play.ht/Polly + infra)
  - *Operação e inteligência* = `custoMoBrl` (mão de obra por número × plano MO)