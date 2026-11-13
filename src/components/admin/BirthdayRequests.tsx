import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideBirthday } from "@/lib/birthday-actions";

/** Заявки игроков на смену даты рождения (уже заданную дату меняет только админ). */
export async function BirthdayRequests({ locale }: { locale: Locale }) {
  const { data, error } = await createAdminClient().rpc("birthday_requests");
  if (error) console.error("birthday_requests failed", { code: error.code, message: error.message });
  const rows = (data ?? []) as { profile_id: string; nickname: string | null; birthday: string | null; requested: string }[];
  if (rows.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "admin.birthdays" });
  const fmt = (d: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  return (
    <section id="birthdays" aria-labelledby="birthdays-title">
      <h2 id="birthdays-title" className="text-xl font-bold">{t("title")}</h2>
      <p className="mt-1 text-sm text-neutral-400">{t("hint")}</p>
      <ul className="mt-4 divide-y divide-white/10 rounded border border-white/10">
        {rows.map((r) => (
          <li key={r.profile_id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <span className="flex-1">
              <span className="font-semibold">{r.nickname ?? "—"}</span>
              <span className="ml-3 text-sm text-neutral-400">
                {r.birthday ? fmt(r.birthday) : "—"} → <span className="text-white">{fmt(r.requested)}</span>
              </span>
            </span>
            <form action={decideBirthday} className="flex gap-2 text-sm">
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
