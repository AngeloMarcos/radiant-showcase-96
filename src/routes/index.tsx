import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/mentoark/Navbar";
import { Hero } from "@/components/mentoark/Hero";
import { Modules } from "@/components/mentoark/Modules";
import { TechStack } from "@/components/mentoark/TechStack";
import { TseData } from "@/components/mentoark/TseData";
import { Timeline } from "@/components/mentoark/Timeline";
import { Differentials } from "@/components/mentoark/Differentials";
import { CTA } from "@/components/mentoark/CTA";
import { Footer } from "@/components/mentoark/Footer";
import { BackToTop } from "@/components/mentoark/BackToTop";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plataforma de Inteligência Eleitoral — MentoArk" },
      {
        name: "description",
        content:
          "Sistema completo de consulta eleitoral, gestão de campanha e análise de dados com dados oficiais do TSE e automação via WhatsApp.",
      },
      { property: "og:title", content: "Plataforma de Inteligência Eleitoral — MentoArk" },
      {
        property: "og:description",
        content:
          "Inteligência eleitoral para campanhas que vencem. Dados oficiais do TSE, CRM, mapas de calor e WhatsApp nativo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="mentoark min-h-screen">
      <Navbar />
      <Hero />
      <Modules />
      <TechStack />
      <TseData />
      <Timeline />
      <Differentials />
      <CTA />
      <Footer />
      <BackToTop />
    </main>
  );
}
