import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, InfoSection } from "@/components/InfoPage";

export const Route = createFileRoute("/a-propos")({
  head: () => ({ meta: [
    { title: "À propos — Fernlace" }, { name: "description", content: "Découvrez Fernlace, une marque démo de sneakers originales pensées pour le quotidien." },
    { property: "og:title", content: "À propos — Fernlace" }, { property: "og:description", content: "Des sneakers originales, simples et durables." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AboutPage,
});

function AboutPage() {
  return <InfoPage eyebrow="Notre histoire" title="Des paires qui suivent vos pas." intro="Fernlace imagine des sneakers originales aux lignes simples, avec des matières choisies et des coloris faciles à porter.">
    <InfoSection title="Notre approche"><p>Nous dessinons peu de modèles, mais nous les retravaillons avec soin : une silhouette équilibrée, une semelle confortable et des détails utiles. Chaque paire est pensée pour rejoindre votre quotidien plutôt que rester dans sa boîte.</p></InfoSection>
    <InfoSection title="Une boutique de démonstration"><p>Fernlace est une marque fictive créée pour présenter cette boutique. Les produits sont des exemples et aucun paiement réel n’est traité.</p></InfoSection>
  </InfoPage>;
}
