"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getStaffContext } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { MATCHES_TAG } from "@/lib/players";
import { ALIASES_TAG } from "@/lib/aliases";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Одобрить или отклонить повторную смену ника в течение года. Только владелец клуба. */
export async function decideNickname(formData: FormData) {
  const v = String(formData.get("locale") ?? "");
  const locale: Locale = (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
  const back = getPathname({ href: "/admin", locale });
  const profileId = String(formData.get("profileId") ?? "");
  if (!UUID_RE.test(profileId)) redirect(`${back}?error=invalid#nicknames`);
  const ctx = await getStaffContext();
  if (!ctx || !ctx.clubs.some((c) => c.roles.includes("owner"))) redirect(`${back}?error=save#nicknames`);
  const approve = formData.get("decision") === "approve";
  const { data, error } = await createAdminClient().rpc("nickname_decide", { p_profile: profileId, p_approve: approve });
  if (error || data === "taken") {
    if (error) console.error("nickname_decide failed", { code: error.code, message: error.message });
    redirect(`${back}?error=${data === "taken" ? "taken" : "save"}#nicknames`);
  }
  if (data === "approved") {
    updateTag(MATCHES_TAG);
    updateTag(ALIASES_TAG);
  }
  redirect(`${back}#nicknames`);
}
