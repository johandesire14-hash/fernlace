import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/commerce";

export const Route = createFileRoute("/panier")({
  head: () => ({ meta: [
    { title: "Votre panier — Fernlace" },
    { name: "description", content: "Modifiez les articles de votre panier Fernlace et vérifiez le total avant commande." },
    { property: "og:title", content: "Votre panier — Fernlace" },
    { property: "og:description", content: "Votre sélection de sneakers Fernlace." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CartPage,
});

function CartPage() {
  const { items, total, setQuantity, removeItem } = useCart();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Votre sélection</p>
      <h1 className="mt-2 text-4xl font-bold">Panier</h1>
      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-lg font-semibold">Votre panier est vide.</p>
          <p className="mt-2 text-sm text-muted-foreground">Trouvez votre prochaine paire dans le catalogue.</p>
          <Link to="/catalogue" className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">Voir le catalogue</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_300px]">
          <section className="space-y-3" aria-label="Articles du panier">
            {items.map((item) => (
              <article key={item.key} className="flex gap-4 rounded-2xl border border-border bg-card p-3">
                <Link to="/produit/$id" params={{ id: item.id }} className="size-24 shrink-0 overflow-hidden rounded-xl bg-photo">
                  {item.image && <img src={item.image} alt={item.name} className="size-full object-cover" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div><h2 className="font-semibold leading-tight">{item.name}</h2><p className="mt-1 text-xs text-muted-foreground">{[item.size && `Taille ${item.size}`, item.color].filter(Boolean).join(" · ")}</p></div>
                    <button onClick={() => removeItem(item.key)} className="p-1 text-muted-foreground hover:text-destructive" aria-label={`Supprimer ${item.name}`}><Trash2 className="size-4" /></button>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-lg border border-border">
                      <button onClick={() => setQuantity(item.key, item.quantity - 1)} disabled={item.quantity <= 1} className="p-2 disabled:opacity-30" aria-label="Diminuer la quantité"><Minus className="size-4" /></button>
                      <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{item.quantity}</span>
                      <button onClick={() => setQuantity(item.key, item.quantity + 1)} disabled={item.quantity >= (item.maxQuantity ?? 99)} className="p-2 disabled:opacity-30" aria-label="Augmenter la quantité"><Plus className="size-4" /></button>
                    </div>
                    <p className="font-display font-bold">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              </article>
            ))}
          </section>
          <aside className="h-fit rounded-2xl border border-border bg-card p-5 md:sticky md:top-24">
            <h2 className="text-xl font-bold">Récapitulatif</h2>
            <div className="mt-5 flex justify-between text-sm text-muted-foreground"><span>Livraison</span><span>Calculée après validation</span></div>
            <div className="mt-4 flex items-end justify-between border-t border-border pt-4"><span>Total</span><strong className="font-display text-2xl">{formatPrice(total)}</strong></div>
            <Link to="/commande" className="mt-6 block rounded-xl bg-primary py-3.5 text-center font-bold text-primary-foreground hover:brightness-110">Passer commande</Link>
            <Link to="/catalogue" className="mt-4 block text-center text-sm text-primary">Continuer mes achats</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
