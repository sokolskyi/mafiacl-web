"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { TOURNAMENTS_TAG } from "@/lib/tournaments";

function toLocale(value: FormDataEntryValue | null): Locale {
  const v = String(value ?? "");
  return (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
}

/** Регистрация на турнир у нас на сайте: себя, только пока регистрация открыта (это проверяет база). */
export async function registerTournament(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const id = Number(formData.get("tournamentId"));
  const slug = String(formData.get("slug") ?? "");
  const back = getPathname({ href: { pathname: "/tournaments/[slug]", params: { slug } }, locale });
  if (!Number.isInteger(id) || id < 1) redirect(back);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect(getPathname({ href: "/account", locale }));

  const { error } = await supabase.from("tournament_registrations").insert({ tournament_id: id, profile_id: userId });
  if (error && error.code !== "23505") {
    console.error("registerTournament failed", { id, code: error.code, message: error.message });
    redirect(`${back}?reg=${error.message.includes("banned") ? "banned" : "error"}#registration`);
  }
  updateTag(TOURNAMENTS_TAG);
  redirect(`${back}?reg=ok#registration`);
}

export async function cancelTournament(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const id = Number(formData.get("tournamentId"));
  const slug = String(formData.get("slug") ?? "");
  const back = getPathname({ href: { pathname: "/tournaments/[slug]", params: { slug } }, locale });
  if (!Number.isInteger(id) || id < 1) redirect(back);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect(getPathname({ href: "/account", locale }));

  const { error } = await supabase
    .from("tournament_registrations")
    .update({ status: "cancelled" })
    .eq("tournament_id", id)
    .eq("profile_id", userId)
    .neq("status", "cancelled");
  if (error) console.error("cancelTournament failed", { id, code: error.code, message: error.message });
  updateTag(TOURNAMENTS_TAG);
  redirect(`${back}#registration`);
}
