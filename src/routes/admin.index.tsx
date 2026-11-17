import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Euro, Package, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchDbProducts } from "@/lib/shop";
import { countsTowardsRevenue, formatPrice } from "@/lib/commerce";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [
    { title: "Tableau de bord — Fernlace" }, { name: "description", content: "Vue d’ensemble des commandes, ventes et stocks Fernlace." },
    { property: "og:title", content: "Tableau de bord — Fernlace" }, { property: "og:description", content: "Votre boutique en un coup d’œil." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: products = [] } = useQuery({ queryKey: ["admin-products"], queryFn: fetchDbProducts });
  const { data: orders = [] } = useQuery({ queryKey: ["admin-orders"], queryFn: async () => {
    const { data, error } = await supabase.from("orders").select("id, customer_name, total, status, created_at").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  } });
  const revenue = orders.filter((order) => countsTowardsRevenue(order.status)).reduce((sum, order) => sum + Number(order.total), 0);
  const outOfStock = products.filter((product) => product.quantity === 0);
  const cards = [
    { label: "Commandes", value: orders.length.toString(), icon: ShoppingCart },
    { label: "Chiffre d’affaires", value: formatPrice(revenue), icon: Euro },
    { label: "Produits", value: products.length.toString(), icon: Package },
    { label: "En rupture", value: outOfStock.length.toString(), icon: AlertTriangle },
  ];
  return (
    <div>
      <h1 className="text-3xl font-bold">Tableau de bord</h1>
      <p className="mt-1 text-sm text-muted-foreground">Votre boutique en un coup d’œil.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-border bg-card p-4"><Icon className="size-5 text-primary" /><p className="mt-4 font-display text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}
      </div>
      <section className="mt-8 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Commandes récentes</h2><Link to="/admin/commandes" className="text-sm text-primary">Tout voir</Link></div>
        {orders.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Aucune commande pour le moment.</p> : <div className="mt-4 divide-y divide-border">{orders.slice(0, 5).map((order) => <div key={order.id} className="flex items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">{order.customer_name}</p><p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("fr-FR")}</p></div><div className="text-right"><p className="font-bold">{formatPrice(Number(order.total))}</p><p className="text-xs text-muted-foreground">{order.status}</p></div></div>)}</div>}
      </section>
      {outOfStock.length > 0 && <section className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"><h2 className="font-bold text-destructive">Stock à réapprovisionner</h2><p className="mt-2 text-sm text-muted-foreground">{outOfStock.map((product) => product.name).join(", ")}</p></section>}
    </div>
  );
}
