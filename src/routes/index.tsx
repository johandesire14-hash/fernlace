import { createFileRoute, Link } from "@tanstack/react-router";
import hero from "@/assets/hero.jpg";
import { useQuery } from "@tanstack/react-query";
import { products } from "@/data/products";
import { fetchAllProducts } from "@/lib/shop";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fernlace — Sneakers originales en cuir et daim" },
      { name: "description", content: "Découvrez les sneakers Fernlace : montantes, basses et running, pensées pour durer." },
      { property: "og:title", content: "Fernlace — Sneakers originales" },
      { property: "og:description", content: "Montantes, basses et running, pensées pour durer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: all = products } = useQuery({ queryKey: ["products"], queryFn: fetchAllProducts });
  const featured = [...all].slice(0, 4);
  return (
    <main>
      <section className="relative overflow-hidden">
        <img src={hero} alt="Sneakers Fernlace sur des marches" width={1600} height={912} className="h-[70vh] min-h-96 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Nouvelle collection</p>
          <h1 className="mt-2 max-w-xl text-4xl font-bold leading-none md:text-6xl">Des sneakers faites pour durer.</h1>
          <Link to="/catalogue" className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-display font-bold text-primary-foreground hover:brightness-110">Voir le catalogue</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Nouveautés</h2>
          <Link to="/catalogue" className="text-sm text-primary">Tout voir →</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="mx-auto mt-14 grid max-w-6xl gap-3 px-4 md:grid-cols-3">
        {[["Livraison offerte", "Dès 80 € en Europe"], ["Retours 30 jours", "Gratuits et sans question"], ["Cuir sélectionné", "Tanneries européennes"]].map(([t, d]) => (
          <div key={t} className="rounded-2xl bg-card p-5">
            <h3 className="font-bold">{t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
