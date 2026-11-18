import { Link } from "@tanstack/react-router";
import { LogIn, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";

export function SiteHeader() {
  const { count } = useCart();
  const cls = "whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground";
  const active = { className: "text-foreground font-semibold" };
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="shrink-0 font-display text-xl font-bold tracking-tight">fern<span className="text-primary">lace</span></Link>
        <nav className="flex items-center gap-4 overflow-x-auto text-sm md:gap-5" aria-label="Navigation principale">
          <Link to="/" className={`hidden md:inline ${cls}`} activeProps={active} activeOptions={{ exact: true }}>Accueil</Link>
          <Link to="/catalogue" className={cls} activeProps={active}>Catalogue</Link>
          <Link to="/a-propos" className={`hidden md:inline ${cls}`} activeProps={active}>À propos</Link>
          <Link to="/contact" className={`hidden md:inline ${cls}`} activeProps={active}>Contact</Link>
          <Link to="/admin" className={`hidden md:inline ${cls}`} activeProps={active}>Créateur</Link>
          <Link to="/espace-client" className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 font-semibold" activeProps={{ className: "border-primary text-primary" }}>
            <LogIn className="size-4" /> <span>Connexion</span>
          </Link>
          <Link to="/panier" className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 font-semibold" activeProps={{ className: "border-primary text-primary" }} aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`}>
            <ShoppingBag className="size-4" /> <span>Panier</span>
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">{count}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const links = [
    ["/a-propos", "À propos"], ["/contact", "Contact"], ["/livraison", "Livraison"], ["/retours", "Retours"], ["/admin", "Espace créateur"],
  ] as const;
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Informations">
          {links.map(([to, label]) => <Link key={to} to={to} className="text-muted-foreground hover:text-foreground">{label}</Link>)}
        </nav>
        <p className="mt-5 text-sm text-muted-foreground">© 2026 Fernlace — boutique de démonstration, aucun paiement réel.</p>
      </div>
    </footer>
  );
}
