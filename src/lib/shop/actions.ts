"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { SHOP_TAG } from "./queries";
import { paymentMode } from "./payment";

function toLocale(value: FormDataEntryValue | null): Locale {
  const v = String(value ?? "");
  return (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
}
const cartPath = (locale: Locale, flag?: string) => {
  const base = getPathname({ href: "/shop/cart", locale });
  return flag ? `${base}?${flag}` : base;
};
const orderPath = (locale: Locale, id: number, flag?: string) => {
  const base = getPathname({ href: { pathname: "/shop/orders/[id]", params: { id: String(id) } }, locale });
  return flag ? `${base}?${flag}` : base;
};

/** Оформить заказ из корзины. Цены и остатки берутся из базы, не из браузера. */
export async function checkout(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  let items: { variantId: number; qty: number }[] = [];
  try {
    const raw = JSON.parse(String(formData.get("items") ?? "[]"));
    if (Array.isArray(raw)) {
      items = raw
        .slice(0, 20)
        .map((x) => ({ variantId: Number(x?.variantId), qty: Number(x?.qty) }))
        .filter((x) => Number.isInteger(x.variantId) && x.variantId > 0 && Number.isInteger(x.qty) && x.qty >= 1 && x.qty <= 20);
    }
  } catch {
    /* пустая корзина ниже */
  }
  if (items.length === 0) redirect(cartPath(locale));

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect(getPathname({ href: "/account", locale }));

  const admin = createAdminClient();
  const { data: club } = await admin.from("clubs").select("id").eq("slug", MAIN_CLUB_SLUG).maybeSingle();
  if (!club) redirect(cartPath(locale, "error=save"));

  const { data: orderId, error } = await admin.rpc("shop_create_order", {
    p_club: club.id,
    p_profile: userId,
    p_items: items,
  });
  if (error || typeof orderId !== "number") {
    const msg = error?.message ?? "";
    console.error("shop_create_order failed", { code: error?.code, message: msg });
    redirect(cartPath(locale, msg.includes("out_of_stock") ? "error=stock" : msg.includes("not_available") ? "error=gone" : msg.includes("too_many_pending") ? "error=pending" : msg.includes("banned") ? "error=banned" : "error=save"));
  }
  updateTag(SHOP_TAG);
  redirect(orderPath(locale, orderId, "placed=1"));
}

/** Тестовая оплата (только в режиме demo): имитирует успешный платёж шлюза. */
export async function payOrderDemo(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const id = Number(formData.get("orderId"));
  if (!Number.isInteger(id) || id < 1 || paymentMode() !== "demo") redirect(getPathname({ href: "/shop", locale }));

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect(getPathname({ href: "/account", locale }));

  // Заказ читаем от имени игрока: RLS пропустит только его собственный.
  const { data: order } = await supabase.from("shop_orders").select("id, club_id, status, total_czk").eq("id", id).maybeSingle();
  if (!order || order.status !== "pending") redirect(orderPath(locale, id));

  const admin = createAdminClient();
  const { error } = await admin.from("payments").insert({
    club_id: order.club_id,
    profile_id: userId,
    purpose: "shop",
    order_id: order.id,
    amount_czk: order.total_czk,
    method: "gopay",
    status: "paid",
    provider_ref: `demo-${order.id}`,
    note: "Тестовая оплата",
  });
  // 23505 — уже оплачено (двойной клик).
  if (error && error.code !== "23505") {
    console.error("payOrderDemo failed", { id, code: error.code, message: error.message });
    redirect(orderPath(locale, id, "error=save"));
  }
  redirect(orderPath(locale, id, "paid=1"));
}

/** Игрок отменяет свой неоплаченный заказ — товар возвращается на склад. */
export async function cancelMyOrder(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const id = Number(formData.get("orderId"));
  if (!Number.isInteger(id) || id < 1) redirect(getPathname({ href: "/shop", locale }));

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect(getPathname({ href: "/account", locale }));

  const admin = createAdminClient();
  const { data: done, error } = await admin
    .from("shop_orders")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("profile_id", userId)
    .eq("status", "pending")
    .select("id");
  if (error) console.error("cancelMyOrder failed", { id, code: error.code, message: error.message });
  if (done?.length) updateTag(SHOP_TAG);
  redirect(orderPath(locale, id));
}
