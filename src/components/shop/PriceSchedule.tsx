import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { money, type Product } from "@/lib/shop/queries";

/** «Цена до 15.02.2027 · с 16.02.2027 — 10 900 Kč» для товаров, у которых цена меняется по датам. */
export async function PriceSchedule({ product, locale, compact }: { product: Product; locale: Locale; compact?: boolean }) {
  if (!product.priceUntil && !product.nextPrice) return null;
  const t = await getTranslations({ locale, namespace: "shop" });
  const d = (iso: string) => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  const parts: string[] = [];
  if (product.onSale && product.priceUntil) parts.push(t("priceUntil", { date: d(product.priceUntil) }));
  if (product.nextPrice) parts.push(t("nextPrice", { date: d(product.nextPrice.from), price: money(locale, product.nextPrice.priceCzk) }));
  if (parts.length === 0) return null;
  return <p className={`${compact ? "mt-1 text-xs" : "mt-2 text-sm"} text-neutral-400`}>{parts.join(" · ")}</p>;
}
