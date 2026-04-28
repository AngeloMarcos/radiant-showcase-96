import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "@/components/tts/Calculator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TTS Cost Calculator — Precificação de Disparos com IA" },
      {
        name: "description",
        content:
          "Calculadora interativa de custos de API (ElevenLabs, Play.ht, Polly, GPT) e mão de obra para soluções de disparo via WhatsApp.",
      },
      { property: "og:title", content: "TTS Cost Calculator" },
      {
        property: "og:description",
        content:
          "Calcule custos, margens e proposta comercial para automação de disparos com áudio e texto.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <Calculator />;
}
