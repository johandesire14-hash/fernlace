import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, InfoSection } from "@/components/InfoPage";

export const Route = createFileRoute("/livraison")({
  head: () => ({ meta: [
    { title: "Livraison — Fernlace" }, { name: "description", content: "Consultez les modalités et délais de livraison de la boutique Fernlace." },
    { property: "og:title", content: "Livraison — Fernlace" }, { property: "og:description", content: "Délais et suivi de livraison Fernlace." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ShippingPage,
});

function ShippingPage() {
  return <InfoPage eyebrow="Chez vous, simplement" title="Livraison et suivi." intro="Les commandes sont préparées avec soin. Le statut passe à « Expédiée » dès que le colis quitte notre atelier.">
    <InfoSection title="Délais indicatifs"><p>Préparation : 1 à 2 jours ouvrés.</p><p>Livraison en France métropolitaine : 2 à 4 jours ouvrés après expédition.</p></InfoSection>
    <InfoSection title="Frais et suivi"><p>La livraison est offerte dès 80 € d’achat. Les éventuels frais sont confirmés avant tout paiement. Cette boutique de démonstration ne réalise ni paiement ni expédition réelle.</p></InfoSection>
  </InfoPage>;
}
