"use client";

import { useSyncExternalStore } from "react";

export type CartItem = {
  variantId: number;
  productId: number;
  name: string;
  label: string;
  priceCzk: number;
  imageUrl: string | null;
  kind: "merch" | "membership" | "certificate";
  /** Ник для печати и цвет — если товар их спрашивает. */
  nickname?: string;
  color?: string;
  /** Абонемент: дата начала (YYYY-MM-DD); пусто — сразу после оплаты. */
  startOn?: string;
  /** Подарочный сертификат: кому, от кого, пожелание. */
  certTo?: string;
  certFrom?: string;
  certMessage?: string;
  qty: number;
};

/** Одна строка корзины = вариант + ник + цвет (две футболки с разными никами — разные строки). */
export const cartKey = (i: Pick<CartItem, "variantId" | "nickname" | "color" | "startOn" | "certTo" | "certFrom" | "certMessage">) =>
  `${i.variantId}|${i.nickname ?? ""}|${i.color ?? ""}|${i.startOn ?? ""}|${i.certTo ?? ""}|${i.certFrom ?? ""}|${i.certMessage ?? ""}`;

const KEY = "mafiacl-cart";
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let snapshot: CartItem[] | null = null;

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

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
      kind: i.kind === "membership" || i.kind === "certificate" ? i.kind : "merch",
      nickname: typeof i.nickname === "string" && i.nickname.trim() ? i.nickname.trim().slice(0, 32) : undefined,
      color: typeof i.color === "string" && i.color.trim() ? i.color.trim().slice(0, 40) : undefined,
      startOn: typeof i.startOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(i.startOn) ? i.startOn : undefined,
      certTo: text(i.certTo, 60),
      certFrom: text(i.certFrom, 60),
      certMessage: text(i.certMessage, 200),
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
  // Абонемент одного вида — одна строка: новая дата начала заменяет прежнюю.
  const items = item.kind === "membership" ? load().filter((x) => x.variantId !== item.variantId) : [...load()];
  const found = items.find((x) => cartKey(x) === cartKey(item));
  if (found) {
    // Абонемент — один на заказ.
    if (item.kind === "merch") found.qty = Math.min(found.qty + 1, 20);
    save(items.map((x) => (x === found ? { ...found } : x)));
  } else {
    save([...items, { ...item, qty: 1 }]);
  }
}

export function setQty(key: string, qty: number) {
  save(load().flatMap((x) => (cartKey(x) !== key ? [x] : qty < 1 ? [] : [{ ...x, qty: Math.min(qty, 20) }])));
}

export function clearCart() {
  save([]);
}
