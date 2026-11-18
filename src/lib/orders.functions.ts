import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Le nom est trop court.").max(100, "Le nom est trop long."),
  phone: z.string().trim().min(6, "Le téléphone est invalide.").max(30, "Le téléphone est trop long.").regex(/^[+0-9 ().-]+$/, "Le téléphone est invalide."),
  address: z.string().trim().min(5, "L’adresse est trop courte.").max(250, "L’adresse est trop longue."),
  city: z.string().trim().min(2, "La ville est invalide.").max(100, "La ville est trop longue."),
  items: z.array(z.object({
    id: z.string().trim().min(1).max(100),
    quantity: z.number().int().min(1).max(20),
    size: z.string().trim().max(50).optional(),
    color: z.string().trim().max(50).optional(),
  })).min(1, "Votre panier est vide.").max(50, "Le panier contient trop d’articles."),
});

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => checkoutSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { products: demoProducts } = await import("@/data/products");
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const dbIds = [...new Set(data.items.map((item) => item.id).filter((id) => uuid.test(id)))];
    const { data: dbProducts, error: productError } = dbIds.length
      ? await supabaseAdmin.from("products").select("id, name, price, quantity, status, images, sizes, size_stock").in("id", dbIds)
      : { data: [], error: null };
    if (productError) throw new Error("Impossible de vérifier les produits. Réessayez.");

    const quantities = new Map<string, number>();
    const sizeQuantities = new Map<string, { id: string; size: string; quantity: number }>();
    for (const item of data.items) {
      quantities.set(item.id, (quantities.get(item.id) ?? 0) + item.quantity);
      if (!uuid.test(item.id)) continue;
      if (!item.size) throw new Error("Choisissez une pointure pour chaque paire.");
      const key = `${item.id}|${item.size}`;
      const line = sizeQuantities.get(key) ?? { id: item.id, size: item.size, quantity: 0 };
      line.quantity += item.quantity;
      sizeQuantities.set(key, line);
    }
    for (const product of dbProducts ?? []) {
      if (product.status !== "Actif" || product.quantity < (quantities.get(product.id) ?? 0)) {
        throw new Error(`Stock insuffisant pour ${product.name}.`);
      }
      for (const line of sizeQuantities.values()) {
        if (line.id !== product.id) continue;
        const available = Number((product.size_stock as Record<string, number>)[line.size] ?? 0);
        if (!product.sizes.includes(line.size) || available < line.quantity) {
          throw new Error(`Stock insuffisant pour ${product.name} en pointure ${line.size}.`);
        }
      }
    }

    const orderItems = data.items.map((item) => {
      const dbProduct = dbProducts?.find((product) => product.id === item.id);
      const demoProduct = demoProducts.find((product) => product.id === item.id);
      const product = dbProduct ?? demoProduct;
      if (!product) throw new Error("Un produit de votre panier n’est plus disponible.");
      return {
        id: item.id,
        name: product.name,
        price: Number(product.price),
        quantity: item.quantity,
        size: item.size ?? null,
        color: item.color ?? null,
        image: product.images[0] ?? null,
      };
    });
    const stock = [...sizeQuantities.values()];
    const total = Math.round(orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
    const authHeader = getRequest()?.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: userData } = await supabaseAdmin.auth.getUser(authHeader.slice("Bearer ".length));
      userId = userData.user?.id ?? null;
    }
    const rpcName = userId ? "submit_order_for_user" : "submit_order";
    const rpcArgs = {
      p_customer_name: data.customerName,
      p_phone: data.phone,
      p_address: data.address,
      p_city: data.city,
      p_items: orderItems,
      p_stock: stock,
      ...(userId ? { p_user_id: userId } : {}),
    };
    const { data: orderId, error } = await supabaseAdmin.rpc(rpcName, rpcArgs);
    if (error) throw new Error(error.message.includes("Stock insuffisant") ? "Le stock a changé. Vérifiez votre panier." : "La commande n’a pas pu être enregistrée.");
    return { orderId, total };
  });
