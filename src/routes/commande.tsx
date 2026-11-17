import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/commerce";
import { submitOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/commande")({
  head: () => ({ meta: [
    { title: "Finaliser la commande — Fernlace" },
    { name: "description", content: "Renseignez vos coordonnées de livraison et confirmez votre commande Fernlace." },
    { property: "og:title", content: "Finaliser la commande — Fernlace" },
    { property: "og:description", content: "Livraison et récapitulatif de votre commande." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: CheckoutPage,
});

const input = "w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary";

function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const [form, setForm] = useState({ customerName: "", phone: "", address: "", city: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ orderId: string; total: number } | null>(null);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      const result = await submitOrder({ data: { ...form, items: items.map(({ id, quantity, size, color }) => ({ id, quantity, size, color })) } });
      setConfirmation(result);
      clearCart();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La commande n’a pas pu être enregistrée.");
    } finally { setBusy(false); }
  };

  if (confirmation) return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <CheckCircle2 className="mx-auto size-14 text-primary" />
      <h1 className="mt-5 text-4xl font-bold">Commande enregistrée</h1>
      <p className="mt-4 text-muted-foreground">Merci {form.customerName}. Votre commande est <strong className="text-foreground">En attente</strong>. Référence : <span className="font-mono text-xs">{confirmation.orderId.slice(0, 8).toUpperCase()}</span>.</p>
      <p className="mt-3 font-display text-2xl font-bold">{formatPrice(confirmation.total)}</p>
      <Link to="/catalogue" className="mt-8 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">Retour au catalogue</Link>
    </main>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Dernière étape</p>
      <h1 className="mt-2 text-4xl font-bold">Votre commande</h1>
      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center"><p>Votre panier est vide.</p><Link to="/catalogue" className="mt-4 inline-block text-primary">Voir le catalogue</Link></div>
      ) : (
        <form onSubmit={submit} className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <h2 className="text-xl font-bold">Coordonnées de livraison</h2>
            <div className="mt-5 grid gap-4">
              <label className="text-sm">Nom complet *<input className={`${input} mt-1.5`} required minLength={2} maxLength={100} autoComplete="name" value={form.customerName} onChange={(e) => update("customerName", e.target.value)} placeholder="Camille Martin" /></label>
              <label className="text-sm">Téléphone *<input className={`${input} mt-1.5`} required minLength={6} maxLength={30} pattern="[+0-9 ().-]+" autoComplete="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="06 12 34 56 78" /></label>
              <label className="text-sm">Adresse *<input className={`${input} mt-1.5`} required minLength={5} maxLength={250} autoComplete="street-address" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="12 rue des Lilas" /></label>
              <label className="text-sm">Ville *<input className={`${input} mt-1.5`} required minLength={2} maxLength={100} autoComplete="address-level2" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Paris" /></label>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Aucun paiement n’est demandé sur cette boutique de démonstration. Vos coordonnées servent uniquement à enregistrer la commande.</p>
          </section>
          <aside className="h-fit rounded-2xl border border-border bg-card p-5">
            <h2 className="text-xl font-bold">Récapitulatif</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => <div key={item.key} className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{item.quantity} × {item.name}<br /><span className="text-xs">{[item.size, item.color].filter(Boolean).join(" · ")}</span></span><span className="shrink-0 font-semibold">{formatPrice(item.price * item.quantity)}</span></div>)}
            </div>
            <div className="mt-5 flex justify-between border-t border-border pt-4"><span>Total</span><strong className="font-display text-2xl">{formatPrice(total)}</strong></div>
            {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <button disabled={busy} className="mt-6 w-full rounded-xl bg-primary py-3.5 font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">{busy ? "Enregistrement…" : "Confirmer la commande"}</button>
            <Link to="/panier" className="mt-4 block text-center text-sm text-primary">Modifier mon panier</Link>
          </aside>
        </form>
      )}
    </main>
  );
}
