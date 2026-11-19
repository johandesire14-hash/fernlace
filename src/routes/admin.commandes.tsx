import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatPrice, ORDER_STATUSES } from "@/lib/commerce";

type Order = Tables<"orders">;
type OrderItem = { id: string; name: string; price: number; quantity: number; size: string | null; color: string | null };

export const Route = createFileRoute("/admin/commandes")({
  head: () => ({ meta: [
    { title: "Commandes — Fernlace" }, { name: "description", content: "Consultez les commandes et mettez à jour leur statut de préparation et livraison." },
    { property: "og:title", content: "Commandes — Fernlace" }, { property: "og:description", content: "Suivi des commandes Fernlace." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: OrdersPage,
});

function OrdersPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: orders = [], isLoading } = useQuery({ queryKey: ["admin-orders", "full"], queryFn: async () => {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as Order[];
  } });
  const current = orders.find((order) => order.id === selected);
  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (!error) { qc.invalidateQueries({ queryKey: ["admin-orders"] }); qc.invalidateQueries({ queryKey: ["admin-orders", "full"] }); }
  };

  return <div>
    <h1 className="text-3xl font-bold">Commandes</h1><p className="mt-1 text-sm text-muted-foreground">{orders.length} commande(s) enregistrée(s).</p>
    <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
      {isLoading ? <p className="p-6 text-sm text-muted-foreground">Chargement…</p> : orders.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Aucune commande pour le moment.</p> : <table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-4">Référence</th><th className="p-4">Client</th><th className="p-4">Date</th><th className="p-4">Total</th><th className="p-4">Statut</th><th className="p-4"></th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-b border-border last:border-0"><td className="p-4 font-mono text-xs">#{order.id.slice(0, 8).toUpperCase()}</td><td className="p-4 font-semibold">{order.customer_name}</td><td className="p-4 text-muted-foreground">{new Date(order.created_at).toLocaleDateString("fr-FR")}</td><td className="p-4 font-bold">{formatPrice(Number(order.total))}</td><td className="p-4"><select aria-label={`Statut de la commande ${order.id.slice(0, 8)}`} value={order.status} onChange={(e) => updateStatus(order.id, e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">{ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></td><td className="p-4"><button onClick={() => setSelected(order.id)} className="font-semibold text-primary">Détail</button></td></tr>)}</tbody></table>}
    </div>
    {current && <div className="fixed inset-0 z-40 flex items-end justify-center bg-background/70 p-0 backdrop-blur-sm md:items-center md:p-4" onClick={() => setSelected(null)}><section onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 md:rounded-2xl">
      <div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">Commande</p><h2 className="font-mono text-xl font-bold">#{current.id.slice(0, 8).toUpperCase()}</h2></div><button onClick={() => setSelected(null)} aria-label="Fermer"><X className="size-5" /></button></div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-background p-3"><p className="text-xs text-muted-foreground">Client</p><p className="mt-1 font-semibold">{current.customer_name}</p></div><div className="rounded-xl bg-background p-3"><p className="text-xs text-muted-foreground">Téléphone</p><a href={`tel:${current.phone}`} className="mt-1 block font-semibold text-primary">{current.phone}</a></div></div>
      <div className="mt-3 rounded-xl bg-background p-3 text-sm"><p className="text-xs text-muted-foreground">Livraison</p><p className="mt-1">{current.address}<br />{current.city}</p></div>
      <h3 className="mt-6 font-bold">Articles</h3><div className="mt-2 divide-y divide-border">{(current.items as unknown as OrderItem[]).map((item, index) => <div key={`${item.id}-${index}`} className="flex justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">{item.quantity} × {item.name}</p><p className="text-xs text-muted-foreground">{[item.size && `Taille ${item.size}`, item.color].filter(Boolean).join(" · ")}</p></div><p className="font-semibold">{formatPrice(item.price * item.quantity)}</p></div>)}</div>
      <div className="mt-4 flex justify-between border-t border-border pt-4"><span>Total</span><strong className="font-display text-2xl">{formatPrice(Number(current.total))}</strong></div>
      <label className="mt-6 block text-sm font-semibold">Statut<select value={current.status} onChange={(e) => updateStatus(current.id, e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3">{ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
    </section></div>}
  </div>;
}
