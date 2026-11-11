"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { checkout } from "@/lib/shop/actions";
import { cartKey, clearCart, setQty, useCart } from "./cart-store";

export function CartView({ signedIn, error }: { signedIn: boolean; error?: string }) {
  const t = useTranslations("shop");
  const locale = useLocale();
  const items = useCart();
  const money = (v: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "CZK", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(v);
  const total = items.reduce((s, i) => s + i.priceCzk * i.qty, 0);

  if (items.length === 0) {
    return (
      <div className="mt-10">
        <p className="text-neutral-300">{t("cartEmpty")}</p>
        <Link href="/shop" className="mt-4 inline-flex min-h-11 items-center font-semibold underline">
          {t("toShop")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
      <div>
        {error && (
          <p role="alert" className="mb-4 rounded border border-red-400/50 bg-red-600/15 p-3 text-sm text-red-300">
            {t(`errors.${error === "stock" || error === "gone" || error === "pending" || error === "banned" || error === "options" ? error : "save"}`)}
          </p>
        )}
        <ul className="divide-y divide-white/15 border-y border-white/15">
          {items.map((i) => (
            <li key={cartKey(i)} className="flex flex-wrap items-center gap-4 py-4">
              {i.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.imageUrl} alt="" width={64} height={64} className="h-16 w-16 rounded object-cover" />
              ) : (
                <span aria-hidden="true" className="h-16 w-16 rounded bg-neutral-800" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{i.name}</p>
                {i.label && <p className="text-sm text-neutral-400">{i.label}</p>}
                {i.nickname && <p className="text-sm text-neutral-300">{t("nickname")}: <span className="font-semibold">{i.nickname}</span></p>}
                {i.color && <p className="text-sm text-neutral-300">{t("color")}: <span className="font-semibold">{i.color}</span></p>}
                <p className="text-sm text-neutral-300">{money(i.priceCzk)}</p>
              </div>
              {i.kind === "merch" ? (
                <div className="flex items-center gap-1" role="group" aria-label={t("qty")}>
                  <button type="button" onClick={() => setQty(cartKey(i), i.qty - 1)} aria-label={t("less")} className="h-11 w-11 rounded-full border border-white/40 text-lg hover:bg-white/10">
                    −
                  </button>
                  <span className="w-8 text-center font-semibold" aria-live="polite">{i.qty}</span>
                  <button type="button" onClick={() => setQty(cartKey(i), i.qty + 1)} aria-label={t("more")} className="h-11 w-11 rounded-full border border-white/40 text-lg hover:bg-white/10">
                    +
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setQty(cartKey(i), 0)} className="min-h-11 px-3 text-sm underline">
                  {t("remove")}
                </button>
              )}
              <p className="w-24 text-right font-bold">{money(i.priceCzk * i.qty)}</p>
            </li>
          ))}
        </ul>
        <button type="button" onClick={clearCart} className="mt-3 min-h-11 text-sm text-neutral-400 underline hover:text-white">
          {t("clear")}
        </button>
      </div>

      <aside className="h-fit rounded-lg border border-white/15 bg-neutral-950/60 p-6">
        <p className="flex items-baseline justify-between text-lg">
          <span>{t("total")}</span>
          <span className="font-display text-4xl font-extrabold">{money(total)}</span>
        </p>
        {signedIn ? (
          <form action={checkout} className="mt-5">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ variantId: i.variantId, qty: i.qty, nickname: i.nickname, color: i.color })))} />
            <button type="submit" className="min-h-12 w-full rounded-full bg-red-600 px-6 font-bold text-white hover:bg-red-500">
              {t("placeOrder")}
            </button>
          </form>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-neutral-300">{t("signInToOrder")}</p>
            <Link href="/account" className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-red-600 px-6 font-bold text-white hover:bg-red-500">
              {t("signIn")}
            </Link>
          </div>
        )}
        <p className="mt-4 text-xs text-neutral-400">{t("membershipNote")}</p>
      </aside>
    </div>
  );
}
