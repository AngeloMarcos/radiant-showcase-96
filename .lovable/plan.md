## Problema

Os botões "1/2 (2m)", "1/3 (3m)", … "100% (sem ramp)" na seção de ramp-up disparam `setRampMeses/setRampDisparosIni/...` corretamente, mas todos compartilham a mesma classe `tts-btn` sem variante "ativo". Resultado: ao clicar, os valores mudam, mas nenhum botão fica destacado — parecendo que o clique não fez nada.

## Solução

1. Adicionar um estado `rampPreset: number | "full" | null` em `Calculator.tsx`.
2. No `onClick` de cada botão `1/N`, setar `setRampPreset(n)` junto com os demais setters; no botão "100% (sem ramp)" setar `setRampPreset("full")`.
3. Aplicar classes condicionais: quando `rampPreset === n` (ou `"full"`), adicionar destaque (background laranja + texto escuro + borda) seguindo o padrão visual existente (`var(--tts-orange)` já usado em outros botões/highlights do arquivo).
4. Resetar `rampPreset` para `null` se o usuário mexer manualmente nos sliders de `rampMeses / rampDisparosIni / rampPctAudioIni / rampNumerosIni` (via wrapper nos `onChange` dos `SliderInput`s correspondentes), para que o destaque só permaneça enquanto os valores ainda batem com o preset.

## Arquivos

- `src/components/tts/Calculator.tsx` — apenas o bloco da seção ramp-up (state + 2 botões + onChange dos 4 sliders do ramp).

Sem mudanças em lógica de cálculo, em `lib/calc.ts`, ou em outras seções.