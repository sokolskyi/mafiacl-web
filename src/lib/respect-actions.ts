"use server";

import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getStaffContext } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { RESPECT_MANUAL, type ManualReason } from "@/lib/respect";

function toLocale(value: FormDataEntryValue | null): Locale {
  const v = String(value ?? "");
  return (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
}
const int = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) ? n : null;
};

/** Игрок активирует код с физической монеты. */
export async function redeemRespectCode(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = getPathname({ href: "/respect", locale });
  const code = String(formData.get("code") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect(getPathname({ href: "/account", locale }));
  if (code.length < 6) redirect(`${back}?error=notFound`);

  const { data: amount, error } = await createAdminClient().rpc("respect_redeem", { p_profile: userId, p_code: code });
  if (error || typeof amount !== "number") {
    const msg = error?.message ?? "";
    const kind = msg.includes("code_used") ? "used" : msg.includes("not_verified") ? "unverified" : msg.includes("code_not_found") ? "notFound" : "save";
    if (kind === "save") console.error("respect_redeem failed", { code: error?.code, message: msg });
    redirect(`${back}?error=${kind}`);
  }
  redirect(`${back}?redeemed=${amount}`);
}

/** Игрок оплачивает часть своего заказа Respect (один раз на заказ). */
export async function applyRespectToOrder(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const orderId = int(formData.get("orderId"));
  const points = int(formData.get("points"));
  if (!orderId || orderId < 1) redirect(getPathname({ href: "/shop", locale }));
  const back = getPathname({ href: { pathname: "/shop/orders/[id]", params: { id: String(orderId) } }, locale });
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect(getPathname({ href: "/account", locale }));
  if (!points || points < 1) redirect(`${back}?error=respect`);

  const { error } = await createAdminClient().rpc("shop_apply_respect", { p_order: orderId, p_profile: userId, p_points: points });
  if (error) {
    console.error("shop_apply_respect failed", { orderId, code: error.code, message: error.message });
    redirect(`${back}?error=respect`);
  }
  redirect(`${back}?respect=1`);
}

/** Ведущий отмечает: вечер оплачен Respect игрока. */
export async function payGameWithRespect(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const gameId = int(formData.get("gameId"));
  const signupId = int(formData.get("signupId"));
  if (!gameId || gameId < 1) redirect(getPathname({ href: "/admin", locale }));
  const back = getPathname({ href: { pathname: "/admin/games/[id]", params: { id: String(gameId) } }, locale });
  if (!signupId || signupId < 1) redirect(`${back}?error=invalid`);

  const ctx = await getStaffContext();
  if (!ctx) redirect(getPathname({ href: "/account", locale }));
  const admin = createAdminClient();
  const { data: s } = await admin.from("game_signups").select("id, games!inner ( id, club_id )").eq("id", signupId).eq("game_id", gameId).maybeSingle();
  const clubId = (s?.games as unknown as { club_id: number } | undefined)?.club_id;
  if (!clubId || !ctx.clubs.some((c) => c.id === clubId)) redirect(`${back}?error=save`);

  const { error } = await admin.rpc("respect_pay_game", { p_signup: signupId, p_by: ctx.userId });
  if (error) {
    const insufficient = error.message.includes("insufficient");
    if (!insufficient && !error.message.includes("already_paid")) console.error("respect_pay_game failed", { signupId, code: error.code, message: error.message });
    redirect(`${back}?error=${insufficient ? "respect" : "save"}`);
  }
  redirect(back);
}

async function ownerClub(locale: Locale) {
  const back = getPathname({ href: "/admin/respect", locale });
  const ctx = await getStaffContext();
  const club = ctx?.clubs.find((c) => c.roles.includes("owner") || c.roles.includes("admin"));
  if (!ctx || !club) redirect(getPathname({ href: "/admin", locale }));
  return { back, ctx, club };
}

/** Владелец/админ: начислить или списать Respect игроку по нику. */
export async function adjustRespect(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const { back, ctx, club } = await ownerClub(locale);
  const nickname = String(formData.get("nickname") ?? "").trim();
  const amount = int(formData.get("amount"));
  const reason = String(formData.get("reason") ?? "") as ManualReason;
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);
  if (!nickname || !amount || Math.abs(amount) > 10000 || !(reason in RESPECT_MANUAL)) redirect(`${back}?error=invalid`);

  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("id").ilike("nickname", nickname.replace(/[\\%_]/g, (c) => `\\${c}`)).maybeSingle();
  if (!p) redirect(`${back}?error=noPlayer`);
  const { error } = await admin.rpc("respect_adjust", { p_club: club.id, p_profile: p.id, p_amount: amount, p_reason: reason, p_note: note, p_by: ctx.userId });
  if (error) {
    const kind = error.message.includes("insufficient") ? "insufficient" : error.message.includes("blog_year") ? "blogYear" : "save";
    if (kind === "save") console.error("respect_adjust failed", { code: error.code, message: error.message });
    redirect(`${back}?error=${kind}`);
  }
  redirect(`${back}?saved=1`);
}

/** Владелец/админ: выпустить пачку одноразовых кодов для физических монет. */
export async function createRespectCodes(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const { back, ctx, club } = await ownerClub(locale);
  const count = int(formData.get("count"));
  const amount = int(formData.get("amount"));
  const batch = String(formData.get("batch") ?? "").trim().slice(0, 60);
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  if (!count || count < 1 || count > 300 || !amount || amount < 1 || amount > 10000 || !batch) redirect(`${back}?error=invalid`);

  const { error } = await createAdminClient().rpc("respect_create_codes", {
    p_club: club.id, p_count: count, p_amount: amount, p_batch: batch, p_note: note, p_by: ctx.userId,
  });
  if (error) {
    console.error("respect_create_codes failed", { code: error.code, message: error.message });
    redirect(`${back}?error=save`);
  }
  redirect(`${back}?batch=${encodeURIComponent(batch)}`);
}
