import shoe1 from "@/assets/shoe-1.jpg";
import shoe2 from "@/assets/shoe-2.jpg";
import shoe3 from "@/assets/shoe-3.jpg";
import shoe4 from "@/assets/shoe-4.jpg";
import shoe5 from "@/assets/shoe-5.jpg";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  images: string[];
  material: string;
  weight: string;
  sold: number;
  description: string;
  sizes?: string[];
  colors?: string[];
  quantity?: number;
  compareAtPrice?: number | null;
  status?: "Actif" | "Brouillon";
  sourceImages?: string[];
};

export const categories = ["Tout", "Montantes", "Basses", "Running"] as const;

export const products: Product[] = [
  { id: "court-high-sauge", name: "Court High Sauge", category: "Montantes", price: 89, images: [shoe1, shoe2], material: "Cuir & daim", weight: "780 g", sold: 1248, description: "Montante intemporelle : cuir pleine fleur crème, daim sauge, semelle gomme cousue." },
  { id: "court-high-rouille", name: "Court High Nuit & Rouille", category: "Montantes", price: 94, images: [shoe3], material: "Cuir & daim", weight: "790 g", sold: 864, description: "La même silhouette en cuir noir et daim rouille, semelle blanche contrastée." },
  { id: "club-low-marine", name: "Club Low Marine", category: "Basses", price: 79, images: [shoe4], material: "Cuir & daim", weight: "650 g", sold: 2031, description: "Basse épurée en cuir blanc et daim marine, parfaite au quotidien." },
  { id: "trail-mesh-citron", name: "Trail Mesh Citron", category: "Running", price: 109, images: [shoe5], material: "Mesh technique", weight: "610 g", sold: 512, description: "Running rétro en mesh respirant, accents citron et semelle amortissante crantée." },
  { id: "court-high-sauge-34", name: "Court High Sauge Édition", category: "Montantes", price: 99, images: [shoe2, shoe1], material: "Cuir premium", weight: "780 g", sold: 301, description: "Édition limitée en cuir premium, coutures renforcées et lacets cirés." },
];

export const getProduct = (id: string) => products.find((p) => p.id === id);
