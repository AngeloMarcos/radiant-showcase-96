import { Reveal } from "./Section";

export function CTA() {
  return (
    <section
      id="cta"
      className="relative py-28 md:py-36 px-6 md:px-12 text-center overflow-hidden"
      style={{ background: "var(--ma-bg)" }}
    >
      <div
        className="ma-glow"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(700px, 110vw)",
          height: "400px",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="ma-chip mb-5">Próximo passo</div>
        <h2
          className="font-extrabold tracking-tight leading-[1.15] text-white"
          style={{ fontSize: "clamp(28px, 4.4vw, 48px)" }}
        >
          Pronto para começar?
          <br />
          <span className="ma-gradient-text">Solicite uma demonstração.</span>
        </h2>
        <p className="text-slate-400 leading-relaxed mt-4 max-w-lg mx-auto text-[15px]">
          Entre em contato e receba uma demonstração personalizada adaptada à sua campanha.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <a href="mailto:ola@mentoark.com" className="ma-btn-primary w-full sm:w-auto justify-center">
            Falar com Especialista →
          </a>
          <a
            href="https://mentoark.com"
            target="_blank"
            rel="noreferrer"
            className="ma-btn-secondary w-full sm:w-auto justify-center"
          >
            mentoark.com
          </a>
        </div>

        <Reveal className="mt-12 flex flex-wrap gap-3 justify-center">
          {[
            { label: "Site", val: "mentoark.com" },
            { label: "E-mail", val: "ola@mentoark.com" },
            { label: "Telefone", val: "(11) 9 xxxx-xxxx" },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-xl px-6 py-4 text-center"
              style={{ background: "var(--ma-bg2)", border: "1px solid var(--ma-border)" }}
            >
              <div className="font-mono text-[9px] tracking-widest uppercase text-slate-500 mb-1.5">
                {c.label}
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--ma-purple-light)" }}>
                {c.val}
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
