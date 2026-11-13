import { PriceSchedule } from "./PriceSchedule";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { loc, money, type Product } from "@/lib/shop/queries";

export function ProductImage({ product, locale, className }: { product: Product; locale: Locale; className?: string }) {
  if (product.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={product.imageUrl} alt={loc(product.name, locale)} className={`object-cover ${className ?? ""}`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`flex items-center justify-center bg-neutral-800 font-display text-5xl font-extrabold uppercase text-neutral-500 ${className ?? ""}`}
    >
      {loc(product.name, locale).slice(0, 1)}
    </span>
  );
}

export async function ShopGrid({ products, locale }: { products: Product[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "shop" });
  if (products.length === 0) return <p className="mt-10 text-neutral-400">{t("empty")}</p>;
  return (
    <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => {
        const soldOut = p.variants.length > 0 && p.variants.every((v) => v.stock !== null && v.stock <= 0);
        return (
          <li key={p.id} className="relative flex flex-col overflow-hidden rounded-lg border border-white/15 bg-neutral-950/60 focus-within:outline focus-within:outline-2 focus-within:outline-white">
            <ProductImage product={p} locale={locale} className="aspect-[4/5] w-full object-top" />
            <div className="flex flex-1 flex-col p-5">
              <h2 className="text-lg font-bold">
                <Link href={{ pathname: "/shop/[slug]", params: { slug: p.slug } }} className="after:absolute after:inset-0 hover:underline">
                  {loc(p.name, locale)}
                </Link>
              </h2>
              {p.description && <p className="mt-1 text-sm text-neutral-400">{loc(p.description, locale)}</p>}
              <p className="mt-auto pt-4 flex items-baseline justify-between">
                {p.onSale ? (
                  <span className="font-display text-3xl font-extrabold">{money(locale, p.priceCzk)}</span>
                ) : (
                  <span className="font-semibold text-amber-300">{t("notOnSale")}</span>
                )}
                {soldOut && <span className="text-sm font-semibold text-amber-400">{t("soldOut")}</span>}
              </p>
              <PriceSchedule product={p} locale={locale} compact />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
