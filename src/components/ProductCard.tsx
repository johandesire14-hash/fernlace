import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/products";

export function ProductCard({ p }: { p: Product }) {
  return (
    <Link to="/produit/$id" params={{ id: p.id }} className="group block">
      <div className="overflow-hidden rounded-2xl bg-photo">
        <img src={p.images[0]} alt={p.name} loading="lazy" width={1024} height={1024} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-widest text-primary">{p.category}</p>
      <h3 className="mt-1 font-semibold leading-snug">{p.name}</h3>
      <p className="mt-1 font-display text-lg font-bold">
        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(p.price)}
        {p.compareAtPrice && <span className="ml-2 text-sm font-normal text-muted-foreground line-through">{p.compareAtPrice} €</span>}
      </p>
    </Link>
  );
}
