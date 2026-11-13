import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { cancelMyOrder, payOrderDemo } from "@/lib/shop/actions";
import { paymentMode } from "@/lib/shop/payment";
import { loc, money } from "@/lib/shop/queries";
import type { Localized } from "@/lib/games";
import { ClearCartOnMount } from "@/components/shop/ClearCartOnMount";
import { variantText } from "@/components/shop/variant-label";
import { applyRespectToOrder } from "@/lib/respect-actions";
import { getRespectBalance } from "@/lib/respect-queries";
import { CZK_PER_RESPECT, RESPECT_SHARE } from "@/lib/respect";
import { RespectAmount } from "@/components/respect/RespectAmount";

export const metadata: Metadata = { title: "Order", robots: { index: false, follow: false } };

type Props = PageProps<"/[locale]/shop/orders/[id]">;

export default function Page({ params, searchParams }: Props) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <Suspense fallback={<p className="text-neutral-500">…</p>}>
        <Inner params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Inner({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { locale, id } = (await params) as { locale: Locale; id: string };
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "shop" });
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId < 1) notFound();

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) {
    return (
      <p>
        <Link href="/account" className="underline">{t("signIn")}</Link>
      </p>
    );
  }
  // RLS: игрок видит только свои заказы.
  const { data: order } = await supabase
    .from("shop_orders")
    .select("id, status, total_czk, respect_points, respect_czk, created_at, shop_order_items ( id, name, variant_label, nickname, color, qty, price_czk, product_id, shop_products ( kind ) )")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) notFound();

  const items = order.shop_order_items ?? [];
  const hasMembership = items.some((i) => (i.shop_products as unknown as { kind: string } | null)?.kind === "membership");
  const mode = paymentMode();
  const tr = await getTranslations({ locale, namespace: "respect" });
  // Сколько Respect можно списать: мерч до 50 %, абонемент до 30 % цены, но не больше баланса.
  const respectCap = Math.floor(
    items.reduce((a, i) => {
      const membership = (i.shop_products as unknown as { kind: string } | null)?.kind === "membership";
      return a + Number(i.price_czk) * i.qty * (membership ? RESPECT_SHARE.membership : RESPECT_SHARE.merch);
    }, 0) / CZK_PER_RESPECT,
  );
  const canUseRespect = order.status === "pending" && order.respect_points === 0;
  const respectMax = canUseRespect ? Math.min(respectCap, await getRespectBalance(claims.claims.sub)) : 0;
  const status = order.status as "pending" | "paid" | "fulfilled" | "cancelled";

  return (
    <>
      {sp.placed === "1" && <ClearCartOnMount />}
      {sp.placed === "1" && <p role="status" className="mb-4 rounded border border-green-500/40 bg-green-500/10 p-3 text-green-300">{t("orderPlaced")}</p>}
      {sp.paid === "1" && <p role="status" className="mb-4 rounded border border-green-500/40 bg-green-500/10 p-3 text-green-300">{t("orderPaid")}</p>}
      {sp.respect === "1" && <p role="status" className="mb-4 rounded border border-green-500/40 bg-green-500/10 p-3 text-green-300">{tr("orderApplied")}</p>}
      {sp.error && <p role="alert" className="mb-4 text-red-300">{sp.error === "respect" ? tr("errors.order") : t("errors.save")}</p>}

      <h1 className="text-4xl sm:text-5xl">{t("order", { id: order.id })}</h1>
      <p className="mt-3">
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">{t(`status.${status}`)}</span>
      </p>

      <ul className="mt-8 divide-y divide-white/15 border-y border-white/15">
        {items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <span>
              <span className="font-semibold">{loc(i.name as Localized, locale)}</span>
              {i.variant_label && <span className="text-neutral-400"> · {variantText(i.variant_label, t)}</span>}
              {i.color && <span className="text-neutral-400"> · {i.color}</span>}
              {i.nickname && <span className="text-neutral-400"> · {t("nickname")}: {i.nickname}</span>}
              <span className="text-neutral-400"> × {i.qty}</span>
            </span>
            <span className="font-bold">{money(locale, Number(i.price_czk) * i.qty)}</span>
          </li>
        ))}
      </ul>
      {order.respect_points > 0 && (
        <p className="mt-4 flex items-baseline justify-between text-yellow-200">
          <span>{tr("orderPaidWith")} <RespectAmount n={order.respect_points} /></span>
          <span className="font-bold">−{money(locale, Number(order.respect_czk))}</span>
        </p>
      )}
      <p className="mt-4 flex items-baseline justify-between text-lg">
        <span>{t("total")}</span>
        <span className="font-display text-4xl font-extrabold">{money(locale, Number(order.total_czk))}</span>
      </p>

      {respectMax > 0 && (
        <section className="mt-10 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-6">
          <h2 className="text-xl font-bold">{tr("orderTitle")}</h2>
          <p className="mt-1 text-sm text-neutral-300">{tr("orderHint", { max: respectMax, czk: respectMax * CZK_PER_RESPECT })}</p>
          <form action={applyRespectToOrder} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="orderId" value={order.id} />
            <label className="grid gap-1 text-sm">
              {tr("orderAmount")}
              <input name="points" type="number" required min={1} max={respectMax} step={1} defaultValue={respectMax} className="w-32 rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500" />
            </label>
            <button type="submit" className="min-h-11 rounded bg-yellow-500 px-5 font-bold text-black hover:bg-yellow-400">{tr("orderApply")}</button>
          </form>
        </section>
      )}

      {status === "pending" && (
        <section className="mt-10 rounded-lg border border-white/15 bg-neutral-950/60 p-6">
          <h2 className="text-xl font-bold">{t("pay")}</h2>
          {mode === "demo" ? (
            <form action={payOrderDemo} className="mt-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="orderId" value={order.id} />
              <button type="submit" className="min-h-12 rounded-full bg-red-600 px-6 font-bold text-white hover:bg-red-500">{t("payDemo")}</button>
              <p className="mt-2 text-xs text-neutral-400">{t("payDemoHint")}</p>
            </form>
          ) : mode === "gopay" ? (
            <p className="mt-3 text-neutral-300">{t("payOnline")}</p>
          ) : (
            <p className="mt-3 text-neutral-300">{t("payOnSite")}</p>
          )}
          <form action={cancelMyOrder} className="mt-6">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="orderId" value={order.id} />
            <button type="submit" className="min-h-11 text-sm text-neutral-400 underline hover:text-white">{t("cancelOrder")}</button>
          </form>
        </section>
      )}

      {(status === "paid" || status === "fulfilled") && hasMembership && (
        <p className="mt-8 text-neutral-300">
          {t("membershipActive")}{" "}
          <Link href="/account" className="underline">{t("toAccount")}</Link>
        </p>
      )}
      {status === "paid" && !hasMembership && <p className="mt-8 text-neutral-300">{t("pickup")}</p>}

      <p className="mt-10">
        <Link href="/shop" className="inline-flex min-h-11 items-center underline">{t("toShop")}</Link>
      </p>
    </>
  );
}
