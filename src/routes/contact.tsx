import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { InfoPage, InfoSection } from "@/components/InfoPage";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [
    { title: "Contact — Fernlace" }, { name: "description", content: "Contactez l’équipe Fernlace pour toute question sur un produit ou une commande." },
    { property: "og:title", content: "Contact — Fernlace" }, { property: "og:description", content: "Une question ? Écrivez à l’équipe Fernlace." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ContactPage,
});

function ContactPage() {
  return <InfoPage eyebrow="Nous sommes là" title="Une question ? Écrivez-nous." intro="Pointure, disponibilité ou suivi de commande : notre équipe vous répond avec plaisir.">
    <InfoSection title="Par email"><a href="mailto:bonjour@fernlace.fr" className="inline-flex items-center gap-2 font-semibold text-primary"><Mail className="size-4" /> bonjour@fernlace.fr</a><p>Réponse sous deux jours ouvrés, du lundi au vendredi.</p></InfoSection>
    <InfoSection title="Pour une commande"><p>Indiquez la référence reçue lors de la validation afin que nous puissions retrouver votre demande rapidement.</p></InfoSection>
  </InfoPage>;
}
