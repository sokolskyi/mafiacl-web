import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Locale } from "@/i18n/routing";
import type { Localized } from "@/lib/games";

export const SHOP_TAG = "shop";

export type Variant = { id: number; label: string; stock: number | null };
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
};

/** Текст на языке посетителя; если перевода нет — чешский, русский, английский. */
export function loc(value: Localized | null | undefined, locale: Locale) {
  if (!value) return "";
  return value[locale] || value.cs || value.ru || value.en || value.uk || "";
}

export function money(locale: Locale, value: number) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(value);
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
    .select("id, slug, kind, name, description, price_czk, image_url, gallery, ask_nickname, ask_color, sort, clubs!inner ( slug ), shop_variants ( id, label, stock, sort )")
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
    priceCzk: Number(p.price_czk),
    imageUrl: p.image_url,
    images: [p.image_url, ...(p.gallery ?? [])].filter((x): x is string => Boolean(x)),
    askNickname: p.ask_nickname,
    askColor: p.ask_color,
    variants: [...(p.shop_variants ?? [])].sort((a, b) => a.sort - b.sort || a.id - b.id).map((v) => ({ id: v.id, label: v.label, stock: v.stock })),
  }));
}

export async function getProduct(clubSlug: string, slug: string) {
  return (await getProducts(clubSlug)).find((p) => p.slug === slug) ?? null;
}
