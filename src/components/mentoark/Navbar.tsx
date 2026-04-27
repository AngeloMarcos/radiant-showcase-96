import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "#modulos", label: "Módulos" },
  { href: "#tech", label: "Tecnologia" },
  { href: "#cronograma", label: "Cronograma" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleNav = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) {
      const top = (el as HTMLElement).getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 backdrop-blur-xl transition-all"
        style={{
          background: scrolled ? "rgba(7,7,26,0.92)" : "rgba(7,7,26,0.6)",
          borderBottom: "1px solid var(--ma-border2)",
        }}
      >
        <button
          onClick={() => handleNav("#hero")}
          className="text-white font-extrabold text-lg tracking-tight"
        >
          MentoArk<span style={{ color: "var(--ma-purple-light)" }}>.</span>
        </button>

        <ul className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <li key={l.href}>
              <button
                onClick={() => handleNav(l.href)}
                className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors"
              >
                {l.label}
              </button>
            </li>
          ))}
          <li>
            <button onClick={() => handleNav("#cta")} className="ma-btn-primary !py-2.5 !px-5 !text-[13px]">
              Falar com Especialista
            </button>
          </li>
        </ul>

        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-white p-2 -mr-2"
          aria-label="Menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ background: "rgba(7,7,26,0.85)", backdropFilter: "blur(18px)" }}
        onClick={() => setOpen(false)}
      >
        <div
          className={`absolute right-0 top-0 h-full w-[78%] max-w-xs p-8 pt-24 transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
          style={{ background: "var(--ma-bg2)", borderLeft: "1px solid var(--ma-border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <ul className="flex flex-col gap-2">
            {links.map((l) => (
              <li key={l.href}>
                <button
                  onClick={() => handleNav(l.href)}
                  className="w-full text-left text-white text-base font-semibold py-3 border-b"
                  style={{ borderColor: "var(--ma-border2)" }}
                >
                  {l.label}
                </button>
              </li>
            ))}
            <li className="mt-6">
              <button onClick={() => handleNav("#cta")} className="ma-btn-primary w-full justify-center">
                Falar com Especialista →
              </button>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
