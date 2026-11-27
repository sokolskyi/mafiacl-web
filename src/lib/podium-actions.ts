"use server";

import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyStaff } from "@/lib/staffNotify";
import { escapeHtml } from "@/lib/telegram/api";
import { MAIN_CLUB_SLUG } from "@/lib/site";

const toLocale = (v: FormDataEntryValue | null): Locale =>
  (routing.locales as readonly string[]).includes(String(v)) ? (String(v) as Locale) : routing.defaultLocale;

/** Игрок сообщает о призовом месте на турнире другой федерации (за MafiaCL). Проверку делает администрация. */
export async function claimPodium(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = getPathname({ href: "/account", locale });
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const federation = String(formData.get("federation") ?? "").trim().slice(0, 60);
  const date = String(formData.get("date") ?? "");
  const place = Number(formData.get("place"));
  const url = String(formData.get("url") ?? "").trim().slice(0, 500);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || ![1, 2, 3].includes(place) || !/^https:\/\/\S+$/.test(url) || name.length < 2) {
    redirect(`${back}?podium=invalid#podium`);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("podium_claim", { p_name: name, p_federation: federation, p_date: date, p_place: place, p_url: url });
  if (error) {
    const reason = ["forbidden", "invalid", "date", "too_many", "duplicate"].find((r) => error.message.includes(r)) ?? "save";
    if (reason === "save") console.error("podium_claim failed", { code: error.code, message: error.message });
    redirect(`${back}?podium=${reason}#podium`);
  }
  try {
    const db = createAdminClient();
    const [{ data: club }, { data: claims }] = await Promise.all([
      db.from("clubs").select("id").eq("slug", MAIN_CLUB_SLUG).maybeSingle(),
      supabase.auth.getClaims(),
    ]);
    const { data: me } = await db.from("profiles").select("nickname").eq("id", claims?.claims.sub ?? "").maybeSingle();
    if (club) {
      await notifyStaff(club.id, [
        `🏆 <b>Заявка на призовое место №${data}</b> — проверьте в админке`,
        `${escapeHtml(me?.nickname ?? "—")} · ${place} место · ${escapeHtml(name)}${federation ? ` (${escapeHtml(federation)})` : ""} · ${date.split("-").reverse().join(".")}`,
        escapeHtml(url),
      ]);
    }
  } catch (e) {
    console.error("podium notify failed", e);
  }
  redirect(`${back}?podium=sent#podium`);
}

/** Администрация подтверждает или отклоняет заявку; при подтверждении база начисляет Respect. */
export async function decidePodium(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = getPathname({ href: "/admin", locale });
  const id = Number(formData.get("id"));
  const approve = formData.get("decision") === "approve";
  if (!Number.isInteger(id) || id < 1) redirect(`${back}?podium=error#podiums`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("podium_decide", { p_id: id, p_approve: approve });
  if (error) {
    console.error("podium_decide failed", { code: error.code, message: error.message });
    redirect(`${back}?podium=error#podiums`);
  }
  redirect(`${back}?podium=${approve ? "approved" : "rejected"}#podiums`);
}
