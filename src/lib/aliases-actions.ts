"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getStaffContext } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALIASES_TAG } from "@/lib/aliases";
import { MATCHES_TAG } from "@/lib/players";

async function guard(formData: FormData) {
  const v = String(formData.get("locale") ?? "");
  const locale: Locale = (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
  const back = `${getPathname({ href: "/admin", locale })}`;
  const ctx = await getStaffContext();
  if (!ctx || !ctx.clubs.some((c) => c.roles.includes("owner") || c.roles.includes("admin"))) redirect(`${back}?error=save#aliases`);
  return back;
}

function done(back: string, status: string): never {
  updateTag(ALIASES_TAG);
  updateTag(MATCHES_TAG);
  redirect(`${back}?alias=${status}#aliases`);
}

/** Связать старый ник с текущим. Только owner/admin клуба. */
export async function saveAlias(formData: FormData) {
  const back = await guard(formData);
  const alias = String(formData.get("alias") ?? "").trim();
  const canonical = String(formData.get("canonical") ?? "").trim();
  if (!alias || !canonical || alias.length > 64 || canonical.length > 64 || alias.toLowerCase() === canonical.toLowerCase()) {
    redirect(`${back}?alias=invalid#aliases`);
  }
  const db = createAdminClient();
  // Цепочек не допускаем: если текущий ник сам записан как старый — берём его текущий
  const { data: up } = await db.from("player_aliases").select("canonical").ilike("alias", canonical.replace(/[\\%_]/g, (c) => `\\${c}`)).maybeSingle();
  const target = up?.canonical ?? canonical;
  const { error } = await db.from("player_aliases").upsert({ alias, canonical: target }, { onConflict: "alias" });
  if (error) {
    console.error("saveAlias failed", { code: error.code, message: error.message });
    redirect(`${back}?alias=invalid#aliases`);
  }
  // Кто ссылался на старый ник как на текущий — переводим на новый текущий
  await db.from("player_aliases").update({ canonical: target }).ilike("canonical", alias.replace(/[\\%_]/g, (c) => `\\${c}`));
  done(back, "saved");
}

export async function removeAlias(formData: FormData) {
  const back = await guard(formData);
  const alias = String(formData.get("alias") ?? "");
  const { error } = await createAdminClient().from("player_aliases").delete().eq("alias", alias);
  if (error) console.error("removeAlias failed", { code: error.code, message: error.message });
  done(back, "removed");
}

/** «В клубе с (год)» для любого игрока. Пустой год — убрать ручное значение. Только owner/admin клуба. */
export async function saveClubSince(formData: FormData) {
  const back = await guard(formData);
  const nickname = String(formData.get("nickname") ?? "").trim();
  const raw = String(formData.get("year") ?? "").trim();
  const year = Number(raw);
  if (!nickname || nickname.length > 64 || (raw && (!Number.isInteger(year) || year < 2000 || year > 2100))) {
    redirect(`${back}?alias=invalid#club-since`);
  }
  const db = createAdminClient();
  // Ник без учёта регистра: сначала убираем прежнее значение, потом записываем новое.
  const del = await db.from("player_club_since").delete().ilike("nickname", nickname.replace(/[\\%_]/g, (c) => `\\${c}`));
  const error = del.error ?? (raw ? (await db.from("player_club_since").insert({ nickname, year })).error : null);
  if (error) {
    console.error("saveClubSince failed", { code: error.code, message: error.message });
    redirect(`${back}?alias=invalid#club-since`);
  }
  updateTag(ALIASES_TAG);
  redirect(`${back}?alias=${raw ? "saved" : "removed"}#club-since`);
}
