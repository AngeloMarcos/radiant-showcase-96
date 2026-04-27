export function Footer() {
  return (
    <footer
      className="py-7 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-3 text-center"
      style={{ background: "var(--ma-bg2)", borderTop: "1px solid var(--ma-border2)" }}
    >
      <p className="font-mono text-[10px] tracking-wider text-slate-500">
        <strong style={{ color: "var(--ma-purple-light)" }}>MentoArk</strong> · Automação e Inteligência Artificial
      </p>
      <p className="font-mono text-[10px] tracking-wider text-slate-500">
        Proposta técnica confidencial · Abril 2026
      </p>
      <p className="font-mono text-[10px] tracking-wider text-slate-500">
        Todos os direitos reservados
      </p>
    </footer>
  );
}
