import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { products } from "@/data/products";
import { fetchProduct } from "@/lib/shop";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/lib/cart";
import { formatPrice, parseColor } from "@/lib/commerce";

export const Route = createFileRoute("/produit/$id")({
  loader: async ({ params }) => {
    const product = await fetchProduct(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    const title = p ? `${p.name} — Fernlace` : "Produit introuvable — Fernlace";
    const desc = p?.description ?? "Ce produit n'existe pas.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <main className="mx-auto max-w-6xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Produit introuvable</h1>
      <Link to="/catalogue" className="mt-4 inline-block text-primary">Retour au catalogue</Link>
    </main>
  ),
  component: ProductPage,
});

const defaultSizes = ["39", "40", "41", "42", "43", "44", "45"];

function ProductPage() {
  const { product: p } = Route.useLoaderData();
  const { addItem } = useCart();
  const [img, setImg] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [added, setAdded] = useState(false);
  const sizes = p.sizes?.length ? p.sizes : defaultSizes;
  const [color, setColor] = useState(p.colors?.[0] ?? null);
  const soldOut = p.quantity === 0;
  const related = products.filter((x) => x.id !== p.id).slice(0, 4);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Link to="/catalogue" className="text-sm text-muted-foreground hover:text-foreground">← Catalogue</Link>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <section>
          <div className="overflow-hidden rounded-2xl bg-photo">
            <img src={p.images[img] ?? p.images[0]} alt={p.name} width={1024} height={1024} className="aspect-square w-full object-cover" />
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {p.images.map((g, i) => (
                <button key={i} onClick={() => setImg(i)} className={`overflow-hidden rounded-lg border-2 bg-photo ${i === img ? "border-primary" : "border-transparent opacity-60"}`}>
                  <img src={g} alt="" loading="lazy" width={1024} height={1024} className="size-16 object-cover md:size-20" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{p.category}</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight md:text-4xl">{p.name}</h1>
            <p className="mt-3 font-display text-3xl font-bold">{formatPrice(p.price)} {p.compareAtPrice && <span className="text-lg font-normal text-muted-foreground line-through">{formatPrice(p.compareAtPrice)}</span>}</p>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            {[["Poids", p.weight], ["Matière", p.material], ["Vendus", p.sold.toLocaleString("fr-FR")]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-card p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-1 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Pointure (EU)</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button key={s} onClick={() => { setSize(s); setAdded(false); }} className={`h-11 min-w-12 rounded-lg border px-3 text-sm font-semibold ${size === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"}`}>{s}</button>
              ))}
            </div>
          </div>
          {p.colors && p.colors.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Couleur</p>
              <div className="flex flex-wrap gap-2">
                {p.colors.map((value) => {
                  const c = parseColor(value);
                  return <button key={value} onClick={() => setColor(value)} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${color === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{c.hex && <span className="size-4 rounded-full border border-border" style={{ backgroundColor: c.hex }} />}{c.name}</button>;
                })}
              </div>
            </div>
          )}
          <button disabled={!size || soldOut} onClick={() => {
            if (!size) return;
            addItem({ id: p.id, name: p.name, price: p.price, image: p.images[0], size, color: color ? parseColor(color).name : undefined, quantity: 1 });
            setAdded(true);
          }} className="rounded-xl bg-primary py-4 font-display text-lg font-bold text-primary-foreground hover:brightness-110 disabled:opacity-40">
            {soldOut ? "Rupture de stock" : added ? "✓ Ajouté au panier" : size ? `Ajouter au panier · ${size}` : "Choisissez une pointure"}
          </button>
          {added && <Link to="/panier" className="text-center text-sm font-semibold text-primary">Voir mon panier →</Link>}
          <button onClick={() => setLiked(!liked)} className={`text-left text-sm ${liked ? "text-primary" : "text-muted-foreground"}`}>{liked ? "♥ Dans vos favoris" : "♡ Ajouter aux favoris"}</button>
          <p className="text-sm leading-relaxed text-muted-foreground">{p.description}</p>
        </section>
      </div>

      <section className="mt-14">
        <h2 className="mb-5 text-2xl font-bold">Vous aimerez aussi</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {related.map((x) => <ProductCard key={x.id} p={x} />)}
        </div>
      </section>
    </main>
  );
}
