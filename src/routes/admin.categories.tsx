import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchDbProducts } from "@/lib/shop";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [
    { title: "Catégories — Fernlace" }, { name: "description", content: "Créez et organisez les catégories du catalogue Fernlace." },
    { property: "og:title", content: "Catégories — Fernlace" }, { property: "og:description", content: "Gestion des catégories du catalogue." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) throw error;
    return data;
  } });
  const { data: products = [] } = useQuery({ queryKey: ["admin-products"], queryFn: fetchDbProducts });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["categories"] }); qc.invalidateQueries({ queryKey: ["admin-products"] }); };

  const add = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    const value = name.trim();
    if (!value) return;
    const { error } = await supabase.from("categories").insert({ name: value });
    if (error) setError("Cette catégorie existe déjà ou ne peut pas être créée."); else { setName(""); refresh(); }
  };
  const rename = async (id: string, oldName: string) => {
    setError(null);
    const value = editName.trim();
    if (!value || value === oldName) { setEditing(null); return; }
    const { error } = await supabase.from("categories").update({ name: value }).eq("id", id);
    if (error) { setError("Impossible de renommer cette catégorie."); return; }
    await supabase.from("products").update({ category: value }).eq("category", oldName);
    setEditing(null); refresh();
  };
  const remove = async (id: string, category: string) => {
    setError(null);
    if (products.some((product) => product.category === category)) { setError(`« ${category} » contient encore des produits. Déplacez-les avant de la supprimer.`); return; }
    if (!confirm(`Supprimer la catégorie « ${category} » ?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) setError("Impossible de supprimer cette catégorie."); else refresh();
  };

  return <div>
    <h1 className="text-3xl font-bold">Catégories</h1><p className="mt-1 text-sm text-muted-foreground">Organisez votre catalogue.</p>
    <form onSubmit={add} className="mt-6 flex gap-2"><input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Nouvelle catégorie" className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" /><button className="rounded-xl bg-primary px-5 font-bold text-primary-foreground">+ Ajouter</button></form>
    {error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
      {categories.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Aucune catégorie personnalisée. Les catégories Montantes, Basses et Running restent disponibles.</p> : categories.map((category) => <div key={category.id} className="flex items-center gap-3 border-b border-border p-4 last:border-0">
        {editing === category.id ? <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") rename(category.id, category.name); }} className="min-w-0 flex-1 rounded-lg border border-primary bg-background px-3 py-2 text-sm" /> : <div className="flex-1"><p className="font-semibold">{category.name}</p><p className="text-xs text-muted-foreground">{products.filter((product) => product.category === category.name).length} produit(s)</p></div>}
        {editing === category.id ? <><button onClick={() => rename(category.id, category.name)} className="text-sm font-semibold text-primary">Enregistrer</button><button onClick={() => setEditing(null)} className="text-sm text-muted-foreground">Annuler</button></> : <><button onClick={() => { setEditing(category.id); setEditName(category.name); }} className="p-2 text-muted-foreground hover:text-foreground" aria-label={`Renommer ${category.name}`}><Pencil className="size-4" /></button><button onClick={() => remove(category.id, category.name)} className="p-2 text-muted-foreground hover:text-destructive" aria-label={`Supprimer ${category.name}`}><Trash2 className="size-4" /></button></>}
      </div>)}
    </div>
  </div>;
}
