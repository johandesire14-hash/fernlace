import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, GripVertical, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";
import { BUCKET, fetchCategoryNames, fetchDbProducts } from "@/lib/shop";
import { formatPrice, parseColor } from "@/lib/commerce";

export const Route = createFileRoute("/admin/produits")({
  head: () => ({ meta: [
    { title: "Produits — Fernlace" }, { name: "description", content: "Ajoutez, modifiez et publiez les produits de la boutique Fernlace." },
    { property: "og:title", content: "Produits — Fernlace" }, { property: "og:description", content: "Gestion complète du catalogue Fernlace." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: ProductsPage,
});

type EditorState = { product: Product | null; duplicate: boolean } | null;

function ProductsPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const { data: products = [], isLoading } = useQuery({ queryKey: ["admin-products"], queryFn: fetchDbProducts });
  const filtered = products.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase()));
  const saved = () => { setEditor(null); qc.invalidateQueries(); };
  const remove = async (product: Product) => {
    if (!confirm(`Supprimer définitivement « ${product.name} » ?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (!error) qc.invalidateQueries();
  };

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Produits</h1><p className="mt-1 text-sm text-muted-foreground">{products.length} produit(s), dont {products.filter((p) => p.status === "Actif").length} actif(s).</p></div><button onClick={() => setEditor({ product: null, duplicate: false })} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground"><Plus className="size-4" /> Ajouter un produit</button></div>
    <label className="mt-6 flex items-center gap-2 rounded-xl border border-input bg-background px-3"><Search className="size-4 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un nom ou une catégorie…" className="w-full bg-transparent py-3 text-sm outline-none" /></label>
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
      {isLoading ? <p className="p-6 text-sm text-muted-foreground">Chargement…</p> : filtered.length === 0 ? <div className="p-10 text-center"><p className="text-muted-foreground">Aucun produit trouvé.</p>{products.length === 0 && <button onClick={() => setEditor({ product: null, duplicate: false })} className="mt-3 text-primary">Ajouter votre premier produit</button>}</div> : <table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-4">Produit</th><th className="p-4">Catégorie</th><th className="p-4">Stock</th><th className="p-4">Prix</th><th className="p-4">Statut</th><th className="p-4 text-right">Actions</th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id} className="border-b border-border last:border-0"><td className="p-3"><div className="flex items-center gap-3"><div className="size-12 shrink-0 overflow-hidden rounded-lg bg-photo">{product.images[0] && <img src={product.images[0]} alt="" className="size-full object-cover" />}</div><span className="font-semibold">{product.name}</span></div></td><td className="p-4 text-muted-foreground">{product.category}</td><td className={`p-4 ${product.quantity === 0 ? "text-destructive" : ""}`}>{product.quantity === 0 ? "Rupture" : product.quantity}</td><td className="p-4 font-semibold">{formatPrice(product.price)}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.status === "Actif" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{product.status}</span></td><td className="p-3"><div className="flex justify-end gap-1"><button onClick={() => setEditor({ product, duplicate: false })} className="p-2 text-muted-foreground hover:text-foreground" aria-label={`Modifier ${product.name}`}><Pencil className="size-4" /></button><button onClick={() => setEditor({ product, duplicate: true })} className="p-2 text-muted-foreground hover:text-foreground" aria-label={`Dupliquer ${product.name}`}><Copy className="size-4" /></button><button onClick={() => remove(product)} className="p-2 text-muted-foreground hover:text-destructive" aria-label={`Supprimer ${product.name}`}><Trash2 className="size-4" /></button></div></td></tr>)}</tbody></table>}
    </div>
    {editor && <ProductForm key={`${editor.product?.id ?? "new"}-${editor.duplicate}`} initial={editor.product} duplicate={editor.duplicate} onClose={() => setEditor(null)} onSaved={saved} />}
  </div>;
}

const input = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
const defaultSizes = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];
type ImageDraft = { path: string | null; url: string; file?: File };

function ProductForm({ initial, duplicate, onClose, onSaved }: { initial: Product | null; duplicate: boolean; onClose: () => void; onSaved: () => void }) {
  const { data: categoryList = [] } = useQuery({ queryKey: ["category-names"], queryFn: fetchCategoryNames });
  const categories = [...new Set([...categoryList, ...(initial ? [initial.category] : [])])];
  const [name, setName] = useState(initial ? `${initial.name}${duplicate ? " (copie)" : ""}` : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [compareAt, setCompareAt] = useState(initial?.compareAtPrice ? String(initial.compareAtPrice) : "");
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1));
  const [category, setCategory] = useState(initial?.category ?? "Basses");
  const [status, setStatus] = useState<"Actif" | "Brouillon">(duplicate ? "Brouillon" : initial?.status ?? "Actif");
  const [sizes, setSizes] = useState<string[]>(initial?.sizes ?? []);
  const [sizeInput, setSizeInput] = useState("");
  const [colors, setColors] = useState<string[]>(initial?.colors ?? []);
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#6b8e23");
  const [images, setImages] = useState<ImageDraft[]>(() => (initial?.sourceImages ?? []).map((path, index) => ({ path, url: initial?.images[index] ?? "" })));
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sizeOptions = [...new Set([...defaultSizes, ...sizes])];

  const addFiles = (files: File[]) => {
    const accepted = files.filter((file) => file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024);
    setImages((current) => [...current, ...accepted.map((file) => ({ path: null, url: URL.createObjectURL(file), file }))]);
    if (accepted.length !== files.length) setError("Certaines images ont été ignorées (formats image de 10 Mo maximum uniquement).");
  };
  const makeMain = (index: number) => setImages((current) => [current[index]!, ...current.filter((_, i) => i !== index)]);
  const addSize = () => { const value = sizeInput.trim(); if (value && !sizes.includes(value)) setSizes([...sizes, value]); setSizeInput(""); };
  const addColor = () => { const value = colorName.trim(); if (value) setColors([...colors, `${value}|${colorHex}`]); setColorName(""); };

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const numericPrice = Number(price);
      if (!Number.isFinite(numericPrice) || numericPrice < 0) throw new Error("Le prix est invalide.");
      if (compareAt && Number(compareAt) < numericPrice) throw new Error("Le prix barré doit être supérieur ou égal au prix de vente.");
      const paths: string[] = [];
      for (const image of images) {
        if (image.path) { paths.push(image.path); continue; }
        if (!image.file) continue;
        const path = `${crypto.randomUUID()}-${image.file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, image.file);
        if (uploadError) throw uploadError;
        paths.push(path);
      }
      const values = {
        name: name.trim(), description: description.trim(), price: numericPrice,
        compare_at_price: compareAt ? Number(compareAt) : null, category, status,
        quantity: Math.max(0, parseInt(quantity) || 0), sizes, colors, images: paths,
      };
      const { error: saveError } = initial && !duplicate
        ? await supabase.from("products").update(values).eq("id", initial.id)
        : await supabase.from("products").insert(values);
      if (saveError) throw saveError;
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erreur lors de l’enregistrement."); setBusy(false);
    }
  };

  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-background/75 backdrop-blur-sm md:items-center md:p-4" onClick={onClose}>
    <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-card p-5 md:rounded-2xl md:p-6">
      <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-primary">{initial && !duplicate ? "Modification" : duplicate ? "Duplication" : "Nouveau produit"}</p><h2 className="mt-1 text-2xl font-bold">{initial && !duplicate ? initial.name : duplicate ? `Copie de ${initial?.name}` : "Ajouter un produit"}</h2></div><button type="button" onClick={onClose} aria-label="Fermer"><X className="size-5" /></button></div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Field label="Nom *"><input className={input} required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Court High Sauge" /></Field>
          <Field label="Description"><textarea className={input} rows={5} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Matières, coupe, entretien…" /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Prix (€) *"><input className={input} required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></Field><Field label="Prix barré (€)"><input className={input} type="number" min="0" step="0.01" value={compareAt} onChange={(e) => setCompareAt(e.target.value)} placeholder="Optionnel" /></Field></div>
          <div className="grid grid-cols-2 gap-3"><Field label="Quantité en stock"><input className={input} type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field><Field label="Statut"><select className={input} value={status} onChange={(e) => setStatus(e.target.value as "Actif" | "Brouillon")}><option>Actif</option><option>Brouillon</option></select></Field></div>
          <Field label="Catégorie"><select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></Field>
        </div>
        <div className="space-y-4">
          <Field label="Photos — première photo = image principale">
            <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)); }} className={`rounded-xl border border-dashed p-4 text-center ${dragging ? "border-primary bg-primary/5" : "border-input"}`}>
              <p className="text-sm text-muted-foreground">Glissez-déposez vos images ici</p><label className="mt-2 inline-block cursor-pointer font-semibold text-primary">ou choisissez des fichiers<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(Array.from(e.target.files ?? []))} /></label>
            </div>
            {images.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{images.map((image, index) => <div key={`${image.url}-${index}`} className={`relative overflow-hidden rounded-xl border-2 ${index === 0 ? "border-primary" : "border-transparent"}`}><img src={image.url} alt={`Produit ${index + 1}`} className="aspect-square w-full object-cover" /><div className="absolute inset-x-0 bottom-0 flex justify-between bg-background/85 px-1 py-1"><button type="button" onClick={() => makeMain(index)} className="rounded p-1 text-xs" title="Définir comme image principale">{index === 0 ? "Principale" : <GripVertical className="size-4" />}</button><button type="button" onClick={() => setImages(images.filter((_, i) => i !== index))} className="p-1" aria-label="Retirer la photo"><X className="size-3" /></button></div></div>)}</div>}
          </Field>
          <Field label="Tailles disponibles"><div className="flex flex-wrap gap-2">{sizeOptions.map((size) => <Chip key={size} on={sizes.includes(size)} onClick={() => setSizes(sizes.includes(size) ? sizes.filter((item) => item !== size) : [...sizes, size])}>{size}</Chip>)}</div><div className="mt-2 flex gap-2"><input className={input} value={sizeInput} onChange={(e) => setSizeInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSize(); } }} placeholder="Autre : S, M, L, 47…" /><button type="button" onClick={addSize} className="rounded-xl border border-border px-4">+</button></div></Field>
          <Field label="Couleurs"><div className="flex gap-2"><input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="h-11 w-12 rounded-lg border border-input bg-background p-1" aria-label="Pastille de couleur" /><input className={input} value={colorName} onChange={(e) => setColorName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addColor(); } }} placeholder="Ex. Sauge" /><button type="button" onClick={addColor} className="rounded-xl border border-border px-4">+</button></div>{colors.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{colors.map((value) => { const color = parseColor(value); return <Chip key={value} on onClick={() => setColors(colors.filter((item) => item !== value))}><span className="flex items-center gap-2">{color.hex && <span className="size-3 rounded-full border border-border" style={{ backgroundColor: color.hex }} />}{color.name} <X className="size-3" /></span></Chip>; })}</div>}</Field>
        </div>
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex gap-3"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-3 font-semibold">Annuler</button><button disabled={busy} className="flex-[2] rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Enregistrement…" : status === "Actif" ? "Enregistrer et publier" : "Enregistrer le brouillon"}</button></div>
    </form>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm text-muted-foreground">{label}</span>{children}</label>;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>{children}</button>;
}
