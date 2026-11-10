"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { GAMES_TAG } from "@/lib/games";
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

  if (
    !startsAt || !capacity || (numberRaw !== "" && !number) || (price !== null && !(price >= 0)) ||
    !(STATUSES as readonly string[]).includes(status) || streamUrl === undefined || infoUrl === undefined ||
    (venueRaw !== "" && !venueId)
  ) {
    redirect(gamePath(locale, id, "error=invalid"));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .update({ starts_at: startsAt, capacity, number, price_czk: price, status, stream_url: streamUrl, info_url: infoUrl, venue_id: venueId })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    console.error("updateGame failed", { id, code: error?.code, message: error?.message });
    redirect(gamePath(locale, id, "error=save"));
  }
  updateTag(GAMES_TAG);
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
