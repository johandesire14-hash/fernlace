export const ORDER_STATUSES = ["En attente", "Confirmée", "Expédiée", "Livrée", "Annulée"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type PricedLine = { price: number; quantity: number };

export function calculateCartTotal(lines: PricedLine[]) {
  return Math.round(lines.reduce((sum, line) => sum + line.price * line.quantity, 0) * 100) / 100;
}

export function countsTowardsRevenue(status: string) {
  return status !== "Annulée";
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

export function parseColor(value: string) {
  const [name, hex] = value.split("|");
  return { name: name || value, hex: /^#[0-9a-fA-F]{6}$/.test(hex ?? "") ? hex : null };
}
