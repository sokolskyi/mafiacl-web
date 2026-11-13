"use server";

import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getStaffContext } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Одобрить или отклонить смену даты рождения. Только owner/admin. */
export async function decideBirthday(formData: FormData) {
  const v = String(formData.get("locale") ?? "");
  const locale: Locale = (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
  const back = getPathname({ href: "/admin", locale });
  const profileId = String(formData.get("profileId") ?? "");
  if (!UUID_RE.test(profileId)) redirect(`${back}?error=invalid#birthdays`);
  const ctx = await getStaffContext();
  if (!ctx || !ctx.clubs.some((c) => c.roles.includes("owner") || c.roles.includes("admin"))) redirect(`${back}?error=save#birthdays`);
  const { error } = await createAdminClient().rpc("birthday_decide", { p_profile: profileId, p_approve: formData.get("decision") === "approve" });
  if (error) {
    console.error("birthday_decide failed", { code: error.code, message: error.message });
    redirect(`${back}?error=save#birthdays`);
  }
  redirect(`${back}#birthdays`);
}
