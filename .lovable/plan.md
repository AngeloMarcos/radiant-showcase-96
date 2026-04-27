# Apresentação MentoArk — Plataforma Eleitoral

Transformar o HTML enviado em uma landing page React moderna no app TanStack, totalmente responsiva (mobile-first), com micro-interações, animações suaves no scroll e elementos dinâmicos que tornam a apresentação envolvente em qualquer dispositivo.

## Identidade visual

- **Tema:** dark, roxo/violeta + azul (mantendo a paleta original: `#7c3aed`, `#a78bfa`, `#3b82f6`, fundo `#07071a`).
- **Tipografia:** Inter (texto) + JetBrains Mono (rótulos técnicos), via Google Fonts.
- **Estilo:** glassmorphism sutil, glows radiais, grid de fundo, gradientes em destaques.

## Estrutura da página (single page com âncoras suaves)

1. **Navbar fixa** — logo MentoArk, links (Módulos, Tecnologia, Planos, Cronograma) + CTA. Em mobile vira menu hambúrguer animado (drawer lateral).
2. **Hero** — badge pulsante, título grande com gradiente ("Inteligência Eleitoral para Campanhas que Vencem"), subtítulo, 2 CTAs e 4 stats animados (contador rolando de 0 ao valor: 12 anos, 5.563 municípios, R$220/mês, 12 semanas).
3. **Módulos (4 cards)** — Consulta Eleitoral, Comparativo de Candidatos, Gestão de Campanha, Relatório com Mapa. Cards com hover tilt 3D leve, borda gradiente animada no topo, tags.
4. **Stack tecnológico (9 cards)** — Frontend, IA, Banco, Dados TSE, Mapas, WhatsApp, Gráficos, Pagamentos, Infra.
5. **Dados TSE** — tabela de cobertura + 3 cards destaque (5.563 municípios, R$0 licença, 6 eleições).
6. **Custos operacionais** — lista de itens com valores + bloco de total destacado (R$220/mês) + caixa de margem (~89%).
7. **Planos (3 tiers + avulso)** — Essencial R$117, Profissional R$197 (destacado com gradiente roxo e badge "Mais popular"), Elite R$287 + card de Relatório Avulso (R$100–140).
8. **Cronograma (timeline 12 semanas)** — 6 fases, linha vertical com dots pulsantes, em mobile vira cards empilhados verticalmente com indicador lateral.
9. **Diferenciais (6 cards)** — TSE oficial, WhatsApp, IA roadmap, 100% nacional, entrega 10× rápida, margem 89%.
10. **CTA final** — "Pronto para começar?", botões de contato + cards com site/e-mail/telefone.
11. **Footer** — MentoArk · Abril 2026.

## Interatividade & dinamismo

- **Scroll reveal** em cada seção (fade + slide up) usando IntersectionObserver.
- **Contadores animados** nas stats do hero quando entram em viewport.
- **Parallax sutil** nos glows do hero (movimento ao mover o mouse no desktop).
- **Hover refinado**: cards levantam, ganham borda violeta luminosa e sombra colorida.
- **Toggle de planos**: switch "Mensal / Anual" com recálculo (anual = 2 meses grátis, exibido com desconto).
- **Mobile**: navbar vira drawer animado, grids 1 coluna, timeline com layout vertical compacto, tipografia escalonada com `clamp()`, todos os toques têm feedback (active states).
- **Smooth scroll** entre âncoras com offset da navbar.
- **Botão "voltar ao topo"** que aparece após scroll.

## Responsividade

- Mobile-first com breakpoints em 640px, 768px, 1024px.
- Touch-friendly: botões mín. 44px, espaçamento generoso.
- Imagens/ícones em SVG/emoji escaláveis.
- Testado em larguras de 360px até 1920px.

## Detalhes técnicos

- Substitui o placeholder em `src/routes/index.tsx` por uma página completa.
- Cria componentes em `src/components/mentoark/`: `Navbar.tsx`, `Hero.tsx`, `Modules.tsx`, `TechStack.tsx`, `TseData.tsx`, `Costs.tsx`, `Pricing.tsx`, `Timeline.tsx`, `Differentials.tsx`, `CTA.tsx`, `Footer.tsx`, e hook `useCountUp.ts` + `useReveal.ts`.
- Estilização com Tailwind v4 + tokens CSS customizados adicionados em `src/styles.css` (variáveis da paleta MentoArk, sem quebrar o design system existente — escopadas via classe `.mentoark`).
- Atualiza `head()` da rota com title, description e og tags em português ("Plataforma de Inteligência Eleitoral — MentoArk").
- Sem backend / sem dependências novas pesadas — apenas componentes React puros + Tailwind.

Aprove o plano e eu construo a página completa.
