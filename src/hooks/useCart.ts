import { useCallback, useEffect, useState } from "react";

export type CartItem = {
  id: string;
  size?: string;
  color?: string;
  qty: number;
};

const KEY = "shenlong_cart_v1";
const EVT = `local-list:${KEY}`;

const read = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => x && typeof x.id === "string");
    return [];
  } catch {
    return [];
  }
};

const sameVariant = (a: CartItem, b: { id: string; size?: string; color?: string }) =>
  a.id === b.id && (a.size ?? "") === (b.size ?? "") && (a.color ?? "") === (b.color ?? "");

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setItems(read());
    };
    const onLocal = () => setItems(read());
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, onLocal);
    };
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVT));
  }, []);

  const add = useCallback(
    (item: Omit<CartItem, "qty"> & { qty?: number }) => {
      const next = [...read()];
      const idx = next.findIndex((x) => sameVariant(x, item));
      if (idx >= 0) next[idx] = { ...next[idx], qty: next[idx].qty + (item.qty ?? 1) };
      else next.unshift({ id: item.id, size: item.size, color: item.color, qty: item.qty ?? 1 });
      persist(next.slice(0, 200));
    },
    [persist],
  );

  const removeAt = useCallback(
    (index: number) => {
      const next = read().filter((_, i) => i !== index);
      persist(next);
    },
    [persist],
  );

  const setQty = useCallback(
    (index: number, qty: number) => {
      const next = read();
      if (!next[index]) return;
      if (qty <= 0) {
        persist(next.filter((_, i) => i !== index));
        return;
      }
      next[index] = { ...next[index], qty };
      persist(next);
    },
    [persist],
  );

  const clear = useCallback(() => persist([]), [persist]);
  const hasProduct = useCallback((id: string) => items.some((x) => x.id === id), [items]);
  const totalQty = items.reduce((s, x) => s + x.qty, 0);

  return { items, add, removeAt, setQty, clear, hasProduct, totalQty };
}
