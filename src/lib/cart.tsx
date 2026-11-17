import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { calculateCartTotal } from "@/lib/commerce";

export type CartItem = {
  key: string;
  id: string;
  name: string;
  price: number;
  image?: string | undefined;
  size?: string | undefined;
  color?: string | undefined;
  quantity: number;
};

type NewCartItem = Omit<CartItem, "key">;
type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: NewCartItem) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "fernlace-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as CartItem[];
      if (Array.isArray(saved)) setItems(saved.filter((item) => item.key && item.id && item.quantity > 0));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: calculateCartTotal(items),
    addItem: (item) => {
      const key = `${item.id}|${item.size ?? ""}|${item.color ?? ""}`;
      setItems((current) => {
        const existing = current.find((line) => line.key === key);
        if (existing) return current.map((line) => line.key === key ? { ...line, quantity: Math.min(99, line.quantity + item.quantity) } : line);
        return [...current, { ...item, key, quantity: Math.min(99, item.quantity) }];
      });
    },
    setQuantity: (key, quantity) => setItems((current) => current.map((item) => item.key === key ? { ...item, quantity: Math.max(1, Math.min(99, quantity)) } : item)),
    removeItem: (key) => setItems((current) => current.filter((item) => item.key !== key)),
    clearCart: () => setItems([]),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart doit être utilisé dans CartProvider");
  return context;
}
