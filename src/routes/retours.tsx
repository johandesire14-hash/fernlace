import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoPage, InfoSection } from "@/components/InfoPage";

export const Route = createFileRoute("/retours")({
  head: () => ({ meta: [
    { title: "Retours — Fernlace" }, { name: "description", content: "Découvrez les conditions de retour et d’échange des sneakers Fernlace." },
    { property: "og:title", content: "Retours — Fernlace" }, { property: "og:description", content: "Retours et échanges sous 30 jours." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ReturnsPage,
});

function ReturnsPage() {
  return <InfoPage eyebrow="Essayez tranquillement" title="Retours sous 30 jours." intro="La pointure ne convient pas ? Vous disposez de 30 jours après réception pour demander un retour ou un échange.">
    <InfoSection title="Conditions"><p>Les paires doivent être non portées à l’extérieur, dans leur état d’origine et retournées avec leur boîte. Les produits personnalisés ne sont pas repris.</p></InfoSection>
    <InfoSection title="Faire une demande"><p>Écrivez-nous avec votre référence de commande et le motif du retour. Nous vous indiquerons la marche à suivre.</p><Link to="/contact" className="inline-block font-semibold text-primary">Contacter Fernlace →</Link></InfoSection>
  </InfoPage>;
}
