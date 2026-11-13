import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Locale } from "@/i18n/routing";
import type { Localized } from "@/lib/games";

export const SHOP_TAG = "shop";

export type Variant = { id: number; label: string; stock: number | null; images: string[] };
export type Product = {
  id: number;
  slug: string;
  kind: "merch" | "membership";
  name: Localized;
  description: Localized | null;
  priceCzk: number;
  imageUrl: string | null;
  /** Все фото: первое — главное. */
  images: string[];
  askNickname: boolean;
  askColor: boolean;
  variants: Variant[];
  /** Есть ли цена на сегодня (у товара с расписанием цен вне дат — нет). */
  onSale: boolean;
  /** До какого дня действует текущая цена (если цена меняется по датам). */
  priceUntil: string | null;
  /** Следующая цена по расписанию. */
  nextPrice: { priceCzk: number; from: string } | null;
};

type ScheduleRow = { starts_on: string | null; ends_on: string | null; price_czk: number | string };

/** Сегодняшняя дата по Праге, YYYY-MM-DD. */
function pragueToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date());
}

/** Цена по расписанию на сегодня — так же считает база при заказе (shop_price_on). */
export function priceNow(base: number, rows: ScheduleRow[], today = pragueToday()) {
  if (rows.length === 0) return { priceCzk: base, onSale: true, priceUntil: null, nextPrice: null };
  const sorted = [...rows].sort((a, b) => (a.starts_on ?? "").localeCompare(b.starts_on ?? ""));
  const cur = [...sorted].reverse().find((r) => (!r.starts_on || r.starts_on <= today) && (!r.ends_on || r.ends_on >= today));
  const next = sorted.find((r) => r.starts_on && r.starts_on > today);
  return {
    priceCzk: cur ? Number(cur.price_czk) : next ? Number(next.price_czk) : base,
    onSale: Boolean(cur),
    priceUntil: cur?.ends_on ?? null,
    nextPrice: next?.starts_on ? { priceCzk: Number(next.price_czk), from: next.starts_on } : null,
  };
}

/** Текст на языке посетителя; если перевода нет — чешский, русский, английский. */
export function loc(value: Localized | null | undefined, locale: Locale) {
  if (!value) return "";
  return value[locale] || value.cs || value.ru || value.en || value.uk || "";
}

export function money(locale: Locale, value: number) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "CZK", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(value);
}

/** Витрина клуба: активные товары с вариантами (кешируется, сбрасывается при заказах и правках). */
export async function getProducts(clubSlug: string): Promise<Product[]> {
  "use cache";
  cacheTag(SHOP_TAG);
  cacheLife("minutes");
  if (!isSupabaseConfigured) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("shop_products")
    .select("id, slug, kind, name, description, price_czk, image_url, gallery, ask_nickname, ask_color, sort, clubs!inner ( slug ), shop_variants ( id, label, stock, sort, images ), shop_price_schedule ( starts_on, ends_on, price_czk )")
    .eq("clubs.slug", clubSlug)
    .order("sort")
    .order("id");
  if (error) {
    console.error("getProducts failed", { code: error.code, message: error.message });
    return [];
  }
  return (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    kind: p.kind as Product["kind"],
    name: (p.name ?? {}) as Localized,
    description: (p.description ?? null) as Localized | null,
    ...priceNow(Number(p.price_czk), (p.shop_price_schedule ?? []) as ScheduleRow[]),
    imageUrl: p.image_url,
    images: [p.image_url, ...(p.gallery ?? [])].filter((x): x is string => Boolean(x)),
    askNickname: p.ask_nickname,
    askColor: p.ask_color,
    variants: [...(p.shop_variants ?? [])].sort((a, b) => a.sort - b.sort || a.id - b.id).map((v) => ({ id: v.id, label: v.label, stock: v.stock, images: v.images ?? [] })),
  }));
}

export async function getProduct(clubSlug: string, slug: string) {
  return (await getProducts(clubSlug)).find((p) => p.slug === slug) ?? null;
}
