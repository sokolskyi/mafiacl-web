"use client";

import { useSyncExternalStore } from "react";

export type CartItem = {
  variantId: number;
  productId: number;
  name: string;
  label: string;
  priceCzk: number;
  imageUrl: string | null;
  kind: "merch" | "membership";
  qty: number;
};

const KEY = "mafiacl-cart";
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let snapshot: CartItem[] | null = null;

function sanitize(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return EMPTY;
  const out: CartItem[] = [];
  for (const x of raw.slice(0, 20)) {
    if (!x || typeof x !== "object") continue;
    const i = x as Record<string, unknown>;
    if (!Number.isInteger(i.variantId) || !Number.isInteger(i.qty) || (i.qty as number) < 1) continue;
    out.push({
      variantId: i.variantId as number,
      productId: Number(i.productId) || 0,
      name: String(i.name ?? "").slice(0, 120),
      label: String(i.label ?? "").slice(0, 40),
      priceCzk: Number(i.priceCzk) || 0,
      imageUrl: typeof i.imageUrl === "string" ? i.imageUrl : null,
      kind: i.kind === "membership" ? "membership" : "merch",
      qty: Math.min(i.qty as number, 20),
    });
  }
  return out.length ? out : EMPTY;
}

function load(): CartItem[] {
  if (snapshot) return snapshot;
  try {
    const raw = window.localStorage.getItem(KEY);
    snapshot = raw ? sanitize(JSON.parse(raw)) : EMPTY;
  } catch {
    snapshot = EMPTY;
  }
  return snapshot;
}

function save(items: CartItem[]) {
  snapshot = items.length ? items : EMPTY;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* хранилище недоступно — корзина живёт до перезагрузки */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

export function addToCart(item: Omit<CartItem, "qty">) {
  const items = [...load()];
  const found = items.find((x) => x.variantId === item.variantId);
  if (found) {
    // Абонемент — один на заказ.
    if (item.kind === "merch") found.qty = Math.min(found.qty + 1, 20);
    save(items.map((x) => (x === found ? { ...found } : x)));
  } else {
    save([...items, { ...item, qty: 1 }]);
  }
}

export function setQty(variantId: number, qty: number) {
  save(load().flatMap((x) => (x.variantId !== variantId ? [x] : qty < 1 ? [] : [{ ...x, qty: Math.min(qty, 20) }])));
}

export function clearCart() {
  save([]);
}
