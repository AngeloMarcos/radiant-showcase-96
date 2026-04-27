import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Voltar ao topo"
      className={`fixed bottom-5 right-5 z-40 w-11 h-11 rounded-full flex items-center justify-center transition-all ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
      style={{
        background: "var(--ma-purple)",
        color: "#fff",
        boxShadow: "0 12px 32px rgba(124,58,237,.5)",
      }}
    >
      <ArrowUp size={18} />
    </button>
  );
}
