import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideNickname } from "@/lib/nickname-actions";

/** Заявки на смену ника чаще раза в год — решает владелец клуба. */
export async function NicknameRequests({ locale }: { locale: Locale }) {
  const { data, error } = await createAdminClient().rpc("nickname_requests");
  if (error) console.error("nickname_requests failed", { code: error.code, message: error.message });
  const rows = (data ?? []) as { profile_id: string; nickname: string | null; requested: string; changed_at: string | null }[];
  if (rows.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "admin.nicknames" });
  const fmt = (d: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));
  return (
    <section id="nicknames" aria-labelledby="nicknames-title">
      <h2 id="nicknames-title" className="text-xl font-bold">{t("title")}</h2>
      <p className="mt-1 text-sm text-neutral-400">{t("hint")}</p>
      <ul className="mt-4 divide-y divide-white/10 rounded border border-white/10">
        {rows.map((r) => (
          <li key={r.profile_id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <span className="flex-1">
              <span className="font-semibold">{r.nickname ?? "—"}</span> → <span className="font-semibold text-white">{r.requested}</span>
              {r.changed_at && <span className="ml-3 text-sm text-neutral-400">{t("lastChange", { date: fmt(r.changed_at) })}</span>}
            </span>
            <form action={decideNickname} className="flex gap-2 text-sm">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="profileId" value={r.profile_id} />
              <button name="decision" value="approve" className="rounded bg-green-700 px-3 py-1 font-semibold hover:bg-green-600">{t("approve")}</button>
              <button name="decision" value="reject" className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">{t("reject")}</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
