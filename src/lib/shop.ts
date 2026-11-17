import { supabase } from "@/integrations/supabase/client";
import { products as demoProducts, type Product } from "@/data/products";

export const BUCKET = "product-images";

type Row = {
  id: string; name: string; description: string; category: string; price: number;
  quantity: number; sizes: string[]; colors: string[]; images: string[];
  compare_at_price: number | null; status: "Actif" | "Brouillon";
};

async function signImages(paths: string[]) {
  if (!paths.length) return [] as string[];
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 24);
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
}

export async function rowToProduct(r: Row): Promise<Product> {
  return {
    id: r.id,
    name: r.name,
    category: r.category as Product["category"],
    price: Number(r.price),
    images: await signImages(r.images),
    material: r.colors.length ? r.colors.join(", ") : "—",
    weight: "—",
    sold: 0,
    description: r.description,
    sizes: r.sizes,
    colors: r.colors,
    quantity: r.quantity,
    compareAtPrice: r.compare_at_price === null ? null : Number(r.compare_at_price),
    status: r.status,
    sourceImages: r.images,
  };
}

export async function fetchDbProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return Promise.all(data.map((r) => rowToProduct(r as Row)));
}

export async function fetchAllProducts(): Promise<Product[]> {
  return [...(await fetchDbProducts()), ...demoProducts];
}

export async function fetchCategoryNames(): Promise<string[]> {
  const { data } = await supabase.from("categories").select("name").order("name");
  return [...new Set(["Montantes", "Basses", "Running", ...(data ?? []).map((row) => row.name)])];
}

export async function fetchProduct(id: string): Promise<Product | undefined> {
  const demo = demoProducts.find((p) => p.id === id);
  if (demo) return demo;
  if (!/^[0-9a-f-]{36}$/.test(id)) return undefined;
  const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  return data ? rowToProduct(data as Row) : undefined;
}
