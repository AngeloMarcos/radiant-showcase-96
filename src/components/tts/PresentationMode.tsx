import * as React from "react";
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Check, Sparkles, Maximize2 } from "lucide-react";
import { fmtBRL, fmtNum, calcPlanos } from "./lib/calc";

type Plano = ReturnType<typeof calcPlanos>[number];

interface Props {
  open: boolean;
  onClose: () => void;
  nomeCliente: string;
  planos: Plano[];
  quantidadeNumeros: number;
  disparosEfetivos: number;
  minutosMes: number;
  onCopiarProposta: (p: Plano) => void;
  onBaixarPDF: (p: Plano) => void;
}

type Slide = "capa" | "planos" | "destaque" | "fechamento";
const ORDEM: Slide[] = ["capa", "planos", "destaque", "fechamento"];

export function PresentationMode({
  open, onClose, nomeCliente, planos, quantidadeNumeros,
  disparosEfetivos, minutosMes, onCopiarProposta, onBaixarPDF,
}: Props) {
  const [slide, setSlide] = useState<Slide>("capa");
  const recomendado = planos.find(p => p.destaque) ?? planos[1];

  // Navegação por teclado
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " ") {
        const i = ORDEM.indexOf(slide);
        if (i < ORDEM.length - 1) setSlide(ORDEM[i + 1]);
      }
      if (e.key === "ArrowLeft") {
        const i = ORDEM.indexOf(slide);
        if (i > 0) setSlide(ORDEM[i - 1]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, slide, onClose]);

  // Tentar fullscreen nativo ao abrir
  useEffect(() => {
    if (!open) return;
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => { /* ignore */ });
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { /* ignore */ });
      }
    };
  }, [open]);

  if (!open) return null;

  const idx = ORDEM.indexOf(slide);
  const podePrev = idx > 0;
  const podeNext = idx < ORDEM.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--tts-bg)] text-[var(--tts-text)] overflow-auto">
      {/* Top bar mínima */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-[var(--tts-orange)]" />
          <span className="font-display font-bold text-lg">MentoArk</span>
          {nomeCliente && (
            <span className="text-sm text-[var(--tts-muted)] font-mono ml-3">· {nomeCliente}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[var(--tts-muted)]">
            {idx + 1} / {ORDEM.length}
          </span>
          <button onClick={onClose} className="tts-btn !text-sm !py-2 !px-4" title="Sair (Esc)">
            <X className="size-4" /> Sair
          </button>
        </div>
      </div>

      {/* Conteúdo do slide */}
      <div className="min-h-screen flex items-center justify-center p-8 pt-24 pb-24">
        {slide === "capa" && (
          <div className="max-w-4xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--tts-orange)]/40 bg-[var(--tts-surface-2)]">
              <Sparkles className="size-4 text-[var(--tts-orange)]" />
              <span className="font-mono text-sm">Proposta Comercial</span>
            </div>
            <h1 className="font-display text-6xl md:text-7xl font-bold leading-tight">
              Automação de WhatsApp<br />
              <span style={{ color: "var(--tts-orange)" }}>com IA de ponta a ponta</span>
            </h1>
            {nomeCliente && (
              <p className="text-2xl text-[var(--tts-muted)] font-mono">para {nomeCliente}</p>
            )}
            <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto pt-8">
              <div className="tts-card p-5">
                <p className="text-4xl font-bold font-mono" style={{ color: "var(--tts-orange)" }}>{quantidadeNumeros}</p>
                <p className="text-sm text-[var(--tts-muted)] mt-1">Números ativos</p>
              </div>
              <div className="tts-card p-5">
                <p className="text-4xl font-bold font-mono" style={{ color: "var(--tts-cyan)" }}>{fmtNum(disparosEfetivos)}</p>
                <p className="text-sm text-[var(--tts-muted)] mt-1">Disparos/mês</p>
              </div>
              <div className="tts-card p-5">
                <p className="text-4xl font-bold font-mono" style={{ color: "var(--tts-green)" }}>{fmtNum(minutosMes, 0)}</p>
                <p className="text-sm text-[var(--tts-muted)] mt-1">Minutos de áudio</p>
              </div>
            </div>
            <p className="text-lg text-[var(--tts-muted)] pt-4">
              Pressione <kbd className="px-2 py-1 rounded bg-[var(--tts-surface-2)] font-mono text-sm">→</kbd> para continuar
            </p>
          </div>
        )}

        {slide === "planos" && (
          <div className="max-w-7xl w-full">
            <h2 className="font-display text-5xl font-bold text-center mb-2">Escolha seu plano</h2>
            <p className="text-center text-[var(--tts-muted)] text-lg mb-10">3 níveis de serviço · pague só pelo que usar</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {planos.map(p => {
                const accent = p.destaque ? "var(--tts-orange)" : p.id === "premium" ? "var(--tts-cyan)" : "var(--tts-text)";
                return (
                  <div
                    key={p.id}
                    className={`tts-card p-7 flex flex-col relative ${p.destaque ? "!border-[var(--tts-orange)] tts-card-active md:scale-105 z-10 shadow-[0_30px_80px_-20px_rgba(139,92,246,0.6)]" : ""}`}
                  >
                    {p.badge && (
                      <span className={`tts-badge absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 ${p.destaque ? "tts-badge-orange" : "tts-badge-cyan"} bg-[var(--tts-bg)] border border-current`}>
                        ★ {p.badge}
                      </span>
                    )}
                    <h3 className="font-display text-3xl font-bold">{p.nome}</h3>
                    <p className="text-sm text-[var(--tts-muted)] font-mono mb-4">{p.subtitulo}</p>
                    <div className="font-mono text-5xl font-bold mb-1" style={{ color: accent }}>
                      {fmtBRL(p.preco)}
                      <span className="text-sm text-[var(--tts-muted)] font-normal">/mês</span>
                    </div>
                    <p className="text-sm text-[var(--tts-muted)] font-mono mb-5">
                      Setup: <span className="text-[var(--tts-text)] font-bold">{fmtBRL(p.setup)}</span>
                    </p>
                    <ul className="space-y-2 text-base flex-1 mb-5">
                      {p.features.map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="size-5 mt-0.5 shrink-0" style={{ color: accent }} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-[var(--tts-muted)] font-mono italic">
                      Ideal para: {p.recomendadoPara}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {slide === "destaque" && (
          <div className="max-w-5xl w-full text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--tts-orange)]/10 border border-[var(--tts-orange)]">
              <Sparkles className="size-4 text-[var(--tts-orange)]" />
              <span className="font-mono text-sm font-bold text-[var(--tts-orange)]">Plano recomendado</span>
            </div>
            <h2 className="font-display text-7xl font-bold">{recomendado.nome}</h2>
            <div className="font-mono text-8xl font-bold" style={{ color: "var(--tts-orange)" }}>
              {fmtBRL(recomendado.preco)}
              <span className="text-2xl text-[var(--tts-muted)] font-normal">/mês</span>
            </div>
            <p className="text-xl text-[var(--tts-muted)]">
              + {fmtBRL(recomendado.setup)} de setup único
            </p>
            <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto pt-4">
              <div className="tts-card p-5">
                <p className="text-3xl font-bold font-mono">{fmtNum(recomendado.capacidadeDisparos)}</p>
                <p className="text-sm text-[var(--tts-muted)] mt-1">Disparos/mês</p>
              </div>
              <div className="tts-card p-5">
                <p className="text-3xl font-bold font-mono">{recomendado.sla}</p>
                <p className="text-sm text-[var(--tts-muted)] mt-1">SLA</p>
              </div>
              <div className="tts-card p-5">
                <p className="text-3xl font-bold font-mono">{recomendado.prioridade}</p>
                <p className="text-sm text-[var(--tts-muted)] mt-1">Prioridade</p>
              </div>
            </div>
          </div>
        )}

        {slide === "fechamento" && (
          <div className="max-w-3xl w-full text-center space-y-8">
            <h2 className="font-display text-6xl font-bold">Vamos começar?</h2>
            <p className="text-2xl text-[var(--tts-muted)]">
              Aprove a proposta e iniciamos o setup em até <span className="font-bold text-[var(--tts-text)]">48h</span>.
            </p>
            <div className="tts-card p-8 !border-[var(--tts-orange)]">
              <p className="text-sm font-mono text-[var(--tts-muted)] uppercase tracking-wider mb-2">Investimento</p>
              <p className="font-mono text-5xl font-bold" style={{ color: "var(--tts-orange)" }}>
                {fmtBRL(recomendado.preco)}<span className="text-lg text-[var(--tts-muted)] font-normal">/mês</span>
              </p>
              <p className="text-sm text-[var(--tts-muted)] font-mono mt-1">+ {fmtBRL(recomendado.setup)} setup</p>
            </div>
            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={() => onCopiarProposta(recomendado)}
                className="tts-btn-primary !text-base !py-4 !px-8"
              >
                Enviar proposta no WhatsApp
              </button>
              <button
                onClick={() => onBaixarPDF(recomendado)}
                className="tts-btn !text-base !py-4 !px-8"
              >
                Baixar PDF
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navegação inferior — botões grandes */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 py-5 bg-gradient-to-t from-[var(--tts-bg)] to-transparent">
        <button
          onClick={() => podePrev && setSlide(ORDEM[idx - 1])}
          disabled={!podePrev}
          className="tts-btn !text-base !py-3 !px-6 disabled:opacity-30"
        >
          <ChevronLeft className="size-5" /> Anterior
        </button>
        <div className="flex gap-2">
          {ORDEM.map((s, i) => (
            <button
              key={s}
              onClick={() => setSlide(s)}
              className={`h-2 rounded-full transition-all ${i === idx ? "w-10 bg-[var(--tts-orange)]" : "w-2 bg-[var(--tts-muted)]/40 hover:bg-[var(--tts-muted)]"}`}
              aria-label={`Ir para slide ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={() => podeNext && setSlide(ORDEM[idx + 1])}
          disabled={!podeNext}
          className="tts-btn-primary !text-base !py-3 !px-6 disabled:opacity-30"
        >
          Próximo <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
