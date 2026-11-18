import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { products } from "@/data/products";
import { fetchAllProducts, fetchCategoryNames } from "@/lib/shop";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/catalogue")({
  head: () => ({
    meta: [
      { title: "Catalogue — Fernlace" },
      { name: "description", content: "Tout le catalogue Fernlace : sneakers montantes, basses et running." },
      { property: "og:title", content: "Catalogue — Fernlace" },
      { property: "og:description", content: "Sneakers montantes, basses et running." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalogue,
});

function Catalogue() {
  const [cat, setCat] = useState("Tout");
  const [sort, setSort] = useState("pop");
  const { data: all = products } = useQuery({ queryKey: ["products"], queryFn: fetchAllProducts });
  const { data: categoryNames = [] } = useQuery({ queryKey: ["category-names"], queryFn: fetchCategoryNames });
  const categories = ["Tout", ...categoryNames];
  const list = [...all]
    .filter((p) => cat === "Tout" || p.category === cat)
    .sort((a, b) => (sort === "asc" ? a.price - b.price : sort === "desc" ? b.price - a.price : b.sold - a.sold));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold md:text-4xl">Catalogue</h1>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{c}</button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <option value="pop">Popularité</option>
          <option value="asc">Prix croissant</option>
          <option value="desc">Prix décroissant</option>
        </select>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{list.length} produits</p>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </main>
  );
}
