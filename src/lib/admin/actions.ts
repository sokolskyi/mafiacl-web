"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { GAMES_TAG } from "@/lib/games";
import { MATCHES_TAG } from "@/lib/players";
import { TITLES_TAG } from "@/lib/badges";
import { MEMBERSHIP_PLANS, PAYMENT_METHODS, membershipEnd, type MembershipPlan } from "@/lib/memberships";
import { localInputToIso } from "./time";

// Все действия идут от имени вошедшего пользователя: права проверяет RLS в базе
// (сотрудник клуба — owner/admin/host). Здесь — только проверка формата данных.

function toLocale(value: FormDataEntryValue | null): Locale {
  const v = String(value ?? "");
  return (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
}
function int(value: FormDataEntryValue | null, min: number, max: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}
function optUrl(value: FormDataEntryValue | null) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}
function gamePath(locale: Locale, id: number, flag?: string) {
  const base = getPathname({ href: { pathname: "/admin/games/[id]", params: { id: String(id) } }, locale });
  return flag ? `${base}?${flag}` : base;
}

const STATUSES = ["draft", "open", "closed", "finished", "cancelled"] as const;
const KINDS = ["rating", "fun", "tournament", "corporate", "kids"] as const;

export async function updateGame(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const id = int(formData.get("gameId"), 1, Number.MAX_SAFE_INTEGER);
  if (!id) redirect(getPathname({ href: "/admin", locale }));

  const tz = String(formData.get("timezone") ?? "Europe/Prague");
  const startsAt = localInputToIso(String(formData.get("startsAt") ?? ""), tz);
  const capacity = int(formData.get("capacity"), 1, 40);
  const numberRaw = String(formData.get("number") ?? "").trim();
  const number = numberRaw === "" ? null : int(numberRaw, 1, 100000);
  const priceRaw = String(formData.get("price") ?? "").trim();
  const price = priceRaw === "" ? null : Number(priceRaw);
  const status = String(formData.get("status"));
  const streamUrl = optUrl(formData.get("streamUrl"));
  const infoUrl = optUrl(formData.get("infoUrl"));
  const venueRaw = String(formData.get("venueId") ?? "");
  const venueId = venueRaw === "" ? null : int(venueRaw, 1, Number.MAX_SAFE_INTEGER);
  const finalRaw = String(formData.get("finalRatingId") ?? "");
  const finalRatingId = finalRaw === "" ? null : int(finalRaw, 1, Number.MAX_SAFE_INTEGER);

  if (
    !startsAt || !capacity || (numberRaw !== "" && !number) || (price !== null && !(price >= 0)) ||
    !(STATUSES as readonly string[]).includes(status) || streamUrl === undefined || infoUrl === undefined ||
    (venueRaw !== "" && !venueId) || (finalRaw !== "" && !finalRatingId)
  ) {
    redirect(gamePath(locale, id, "error=invalid"));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .update({ starts_at: startsAt, capacity, number, price_czk: price, status, stream_url: streamUrl, info_url: infoUrl, venue_id: venueId, final_rating_id: finalRatingId })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    console.error("updateGame failed", { id, code: error?.code, message: error?.message });
    redirect(gamePath(locale, id, "error=save"));
  }
  updateTag(GAMES_TAG);
  updateTag(MATCHES_TAG);
  redirect(gamePath(locale, id, "saved=1"));
}

export async function createGame(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = getPathname({ href: "/admin", locale });
  const clubId = int(formData.get("clubId"), 1, Number.MAX_SAFE_INTEGER);
  const tz = String(formData.get("timezone") ?? "Europe/Prague");
  const startsAt = localInputToIso(String(formData.get("startsAt") ?? ""), tz);
  const kind = String(formData.get("kind"));
  const capacity = int(formData.get("capacity"), 1, 40);
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  if (!clubId || !startsAt || !capacity || !(KINDS as readonly string[]).includes(kind)) redirect(`${back}?error=invalid`);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data, error } = await supabase
    .from("games")
    .insert({
      club_id: clubId,
      starts_at: startsAt,
      kind,
      capacity,
      status: "draft",
      title: title ? { cs: title, ru: title, uk: title, en: title } : null,
      created_by: claims?.claims.sub ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createGame failed", { code: error?.code, message: error?.message });
    redirect(`${back}?error=save`);
  }
  redirect(gamePath(locale, data.id, "created=1"));
}

export async function addGuest(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const id = int(formData.get("gameId"), 1, Number.MAX_SAFE_INTEGER);
  const name = String(formData.get("guestName") ?? "").trim().slice(0, 80);
  if (!id) redirect(getPathname({ href: "/admin", locale }));
  if (!name) redirect(gamePath(locale, id, "error=invalid"));

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { error } = await supabase
    .from("game_signups")
    .insert({ game_id: id, guest_name: name, added_by: claims?.claims.sub ?? null });
  if (error) {
    console.error("addGuest failed", { id, code: error.code, message: error.message });
    redirect(gamePath(locale, id, "error=save"));
  }
  updateTag(GAMES_TAG);
  redirect(gamePath(locale, id));
}

/** Ведущий: подтвердить из листа ожидания, убрать из записи, отметить приход. */
export async function changeSignup(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const gameId = int(formData.get("gameId"), 1, Number.MAX_SAFE_INTEGER);
  const signupId = int(formData.get("signupId"), 1, Number.MAX_SAFE_INTEGER);
  const op = String(formData.get("op"));
  if (!gameId || !signupId) redirect(getPathname({ href: "/admin", locale }));

  const patch =
    op === "confirm" ? { status: "confirmed" }
    : op === "remove" ? { status: "cancelled" }
    : op === "checkin" ? { checked_in_at: new Date().toISOString() }
    : op === "uncheck" ? { checked_in_at: null }
    : null;
  if (!patch) redirect(gamePath(locale, gameId));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_signups")
    .update(patch)
    .eq("id", signupId)
    .eq("game_id", gameId)
    .select("id, status");
  if (error || !data?.length) {
    console.error("changeSignup failed", { signupId, op, code: error?.code, message: error?.message });
    redirect(gamePath(locale, gameId, "error=save"));
  }
  updateTag(GAMES_TAG);
  // Подтверждение сверх лимита триггер оставит в листе ожидания — сообщаем об этом.
  redirect(gamePath(locale, gameId, op === "confirm" && data[0].status !== "confirmed" ? "error=full" : undefined));
}

const STAFF_ROLES = ["admin", "host"] as const;

/** Владелец клуба: выдать роль игроку по нику (игрок должен уже войти на сайт и указать ник). */
export async function addStaff(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = getPathname({ href: "/admin", locale });
  const clubId = int(formData.get("clubId"), 1, Number.MAX_SAFE_INTEGER);
  const nickname = String(formData.get("nickname") ?? "").trim();
  const role = String(formData.get("role"));
  // «*» в PostgREST — тоже подстановочный знак; в нике его быть не должно.
  if (!clubId || nickname.length < 2 || nickname.length > 32 || nickname.includes("*") || !(STAFF_ROLES as readonly string[]).includes(role)) {
    redirect(`${back}?error=invalid#team`);
  }

  const supabase = await createClient();
  // Точное совпадение без учёта регистра: экранируем спецсимволы ILIKE.
  const pattern = nickname.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: found } = await supabase.from("profiles").select("id").ilike("nickname", pattern).limit(2);
  if (!found || found.length !== 1) redirect(`${back}?error=noPlayer#team`);

  const { error } = await supabase.from("club_staff").insert({ club_id: clubId, profile_id: found[0].id, role });
  if (error && error.code !== "23505") {
    console.error("addStaff failed", { clubId, role, code: error.code, message: error.message });
    redirect(`${back}?error=save#team`);
  }
  redirect(`${back}?team=1#team`);
}

export async function removeStaff(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = getPathname({ href: "/admin", locale });
  const clubId = int(formData.get("clubId"), 1, Number.MAX_SAFE_INTEGER);
  const profileId = String(formData.get("profileId") ?? "");
  const role = String(formData.get("role"));
  if (!clubId || !/^[0-9a-f-]{36}$/.test(profileId) || !(STAFF_ROLES as readonly string[]).includes(role)) {
    redirect(`${back}?error=invalid#team`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("club_staff")
    .delete()
    .eq("club_id", clubId)
    .eq("profile_id", profileId)
    .eq("role", role);
  if (error) {
    console.error("removeStaff failed", { clubId, code: error.code, message: error.message });
    redirect(`${back}?error=save#team`);
  }
  redirect(`${back}#team`);
}

// ---------------------------------------------------------------------------
// Оплаты (наличные / карта / перевод — отметка сотрудника) и абонементы
// ---------------------------------------------------------------------------

function method(value: FormDataEntryValue | null) {
  const v = String(value ?? "");
  return (PAYMENT_METHODS as readonly string[]).includes(v) ? (v as (typeof PAYMENT_METHODS)[number]) : null;
}

/** Отметить, что игрок заплатил за вечер. Сумма — цена игры. */
export async function recordGamePayment(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const gameId = int(formData.get("gameId"), 1, Number.MAX_SAFE_INTEGER);
  const signupId = int(formData.get("signupId"), 1, Number.MAX_SAFE_INTEGER);
  const how = method(formData.get("method"));
  if (!gameId) redirect(getPathname({ href: "/admin", locale }));
  if (!signupId || !how) redirect(gamePath(locale, gameId, "error=invalid"));

  const supabase = await createClient();
  const { data: s } = await supabase
    .from("game_signups")
    .select("profile_id, games!inner ( id, club_id, price_czk )")
    .eq("id", signupId)
    .eq("game_id", gameId)
    .maybeSingle();
  const game = s?.games as unknown as { club_id: number; price_czk: number | null } | undefined;
  if (!s || !game) redirect(gamePath(locale, gameId, "error=save"));

  const { error } = await supabase.from("payments").insert({
    club_id: game.club_id,
    profile_id: s.profile_id,
    purpose: "game",
    signup_id: signupId,
    amount_czk: Number(game.price_czk ?? 0),
    method: how,
  });
  // 23505 — уже отмечено (двойной клик): не ошибка.
  if (error && error.code !== "23505") {
    console.error("recordGamePayment failed", { signupId, code: error.code, message: error.message });
    redirect(gamePath(locale, gameId, "error=save"));
  }
  redirect(gamePath(locale, gameId));
}

/** Снять ошибочную ручную отметку оплаты. */
export async function undoPayment(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const gameId = int(formData.get("gameId"), 1, Number.MAX_SAFE_INTEGER);
  const paymentId = int(formData.get("paymentId"), 1, Number.MAX_SAFE_INTEGER);
  const back = gameId ? gamePath(locale, gameId) : `${getPathname({ href: "/admin", locale })}#memberships`;
  if (!paymentId) redirect(back);

  const supabase = await createClient();
  const { data, error } = await supabase.from("payments").delete().eq("id", paymentId).select("id");
  if (error || !data?.length) {
    console.error("undoPayment failed", { paymentId, code: error?.code, message: error?.message });
    redirect(gameId ? gamePath(locale, gameId, "error=save") : back);
  }
  redirect(back);
}

/** Выдать абонемент игроку по нику (и, если оплачен на месте, сразу отметить оплату). */
export async function grantMembership(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = getPathname({ href: "/admin", locale });
  const clubId = int(formData.get("clubId"), 1, Number.MAX_SAFE_INTEGER);
  const nickname = String(formData.get("nickname") ?? "").trim();
  const plan = String(formData.get("plan")) as MembershipPlan;
  const from = String(formData.get("validFrom") ?? "");
  const untilRaw = String(formData.get("validUntil") ?? "");
  const payRaw = String(formData.get("method") ?? "");
  const how = payRaw === "none" ? null : method(payRaw);
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = amountRaw === "" ? MEMBERSHIP_PLANS[plan]?.priceCzk ?? 0 : Number(amountRaw);
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

  if (
    !clubId || nickname.length < 2 || nickname.length > 32 || nickname.includes("*") ||
    !(plan in MEMBERSHIP_PLANS) || !isDate(from) || (payRaw !== "none" && !how) || !(amount >= 0)
  ) {
    redirect(`${back}?error=invalid#memberships`);
  }
  const until = plan === "custom" ? untilRaw : membershipEnd(from, plan);
  if (!isDate(until) || until < from) redirect(`${back}?error=invalid#memberships`);

  const supabase = await createClient();
  // Есть аккаунт с таким ником — привязываем сразу; нет — записываем на ник, привяжете позже.
  const pattern = nickname.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: found } = await supabase.from("profiles").select("id").ilike("nickname", pattern).limit(2);
  const profileId = found?.length === 1 ? (found[0].id as string) : null;

  const { data: m, error } = await supabase
    .from("memberships")
    .insert({ club_id: clubId, profile_id: profileId, holder_name: nickname, plan, valid_from: from, valid_until: until, note })
    .select("id")
    .single();
  if (error || !m) {
    console.error("grantMembership failed", { clubId, code: error?.code, message: error?.message });
    redirect(`${back}?error=save#memberships`);
  }
  if (how) {
    const { error: payError } = await supabase.from("payments").insert({
      club_id: clubId,
      profile_id: profileId,
      purpose: "membership",
      membership_id: m.id,
      amount_czk: amount,
      method: how,
    });
    if (payError) {
      console.error("membership payment failed", { membershipId: m.id, code: payError.code, message: payError.message });
      redirect(`${back}?error=save#memberships`);
    }
  }
  redirect(`${back}?membership=${profileId ? "1" : "unlinked"}#memberships`);
}

/** Привязать абонемент (записанный на ник из таблицы) к аккаунту игрока на сайте. */
export async function linkMembership(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = getPathname({ href: "/admin", locale });
  const id = int(formData.get("membershipId"), 1, Number.MAX_SAFE_INTEGER);
  const nickname = String(formData.get("nickname") ?? "").trim();
  if (!id || nickname.length < 2 || nickname.length > 32 || nickname.includes("*")) redirect(`${back}?error=invalid#memberships`);

  const supabase = await createClient();
  const pattern = nickname.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: found } = await supabase.from("profiles").select("id").ilike("nickname", pattern).limit(2);
  if (!found || found.length !== 1) redirect(`${back}?error=noPlayer#memberships`);

  const { data, error } = await supabase.from("memberships").update({ profile_id: found[0].id }).eq("id", id).select("id");
  if (error || !data?.length) {
    console.error("linkMembership failed", { id, code: error?.code, message: error?.message });
    redirect(`${back}?error=save#memberships`);
  }
  redirect(`${back}?membership=linked#memberships`);
}

/** Удалить ошибочно выданный абонемент (вместе с ручной отметкой оплаты). */
export async function removeMembership(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = `${getPathname({ href: "/admin", locale })}#memberships`;
  const id = int(formData.get("membershipId"), 1, Number.MAX_SAFE_INTEGER);
  if (!id) redirect(back);

  const supabase = await createClient();
  await supabase.from("payments").delete().eq("membership_id", id).in("method", PAYMENT_METHODS as unknown as string[]);
  const { data, error } = await supabase.from("memberships").delete().eq("id", id).select("id");
  if (error || !data?.length) {
    console.error("removeMembership failed", { id, code: error?.code, message: error?.message });
  }
  redirect(back);
}

// ---------------------------------------------------------------------------
// Титулы: ⭐ чемпион сезона, 👑 MafiaCL Kings
// ---------------------------------------------------------------------------

export async function addTitle(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = getPathname({ href: "/admin", locale });
  const clubId = int(formData.get("clubId"), 1, Number.MAX_SAFE_INTEGER);
  const nickname = String(formData.get("nickname") ?? "").trim();
  const kind = String(formData.get("kind"));
  const label = String(formData.get("label") ?? "").trim().slice(0, 60);
  const wonOn = String(formData.get("wonOn") ?? "");
  if (
    !clubId || nickname.length < 1 || nickname.length > 32 || nickname.includes("*") || !label ||
    !["season_champion", "kings_winner"].includes(kind) || (wonOn && !/^\d{4}-\d{2}-\d{2}$/.test(wonOn))
  ) {
    redirect(`${back}?error=invalid#titles`);
  }
  const supabase = await createClient();
  const pattern = nickname.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: found } = await supabase.from("profiles").select("id").ilike("nickname", pattern).limit(2);
  const profileId = found?.length === 1 ? (found[0].id as string) : null;
  const { error } = await supabase
    .from("player_titles")
    .insert({ club_id: clubId, profile_id: profileId, holder_name: nickname, kind, label, won_on: wonOn || null });
  if (error) {
    console.error("addTitle failed", { clubId, code: error.code, message: error.message });
    redirect(`${back}?error=save#titles`);
  }
  updateTag(TITLES_TAG);
  redirect(`${back}#titles`);
}

export async function removeTitle(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = `${getPathname({ href: "/admin", locale })}#titles`;
  const id = int(formData.get("titleId"), 1, Number.MAX_SAFE_INTEGER);
  if (!id) redirect(back);
  const supabase = await createClient();
  await supabase.from("player_titles").delete().eq("id", id);
  updateTag(TITLES_TAG);
  redirect(back);
}
