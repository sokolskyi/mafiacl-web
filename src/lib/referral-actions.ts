"use server";

import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

/** «Кто пригласил вас в клуб?» — один раз; проверки (новичок, ник, не сам себя) делает база. */
export async function setReferral(formData: FormData) {
  const v = String(formData.get("locale") ?? "");
  const locale: Locale = (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
  const back = getPathname({ href: "/account", locale });
  const nick = String(formData.get("nick") ?? "").trim().slice(0, 40);
  if (!nick) redirect(`${back}?referral=not_found#referral`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("referral_set", { p_nick: nick });
  if (error) {
    const reason = ["not_found", "self", "not_eligible"].find((r) => error.message.includes(r)) ?? "save";
    if (reason === "save") console.error("referral_set failed", { code: error.code, message: error.message });
    redirect(`${back}?referral=${reason}#referral`);
  }
  redirect(`${back}?referral=saved#referral`);
}
