import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { setReferral } from "@/lib/referral-actions";

const NOTICES = ["saved", "not_found", "self", "not_eligible", "save"] as const;

/**
 * Новичку: подарок 50 Respect после первой игры и «Кто пригласил вас в клуб?».
 * Пригласившему +50 Respect, когда новичок одобрен и сыграл (начисляет база).
 */
export async function AccountReferral({ locale, userId, notice }: { locale: Locale; userId: string; notice?: string }) {
  const t = await getTranslations({ locale, namespace: "referral" });
  const supabase = await createClient();
  const [{ data }, { data: first }] = await Promise.all([
    supabase.rpc("my_referral"),
    supabase.from("respect_ledger").select("id").eq("profile_id", userId).eq("reason", "first_game").limit(1).maybeSingle(),
  ]);
  const row = (Array.isArray(data) ? data[0] : data) as { eligible: boolean; referrer: string | null; rewarded: boolean } | undefined;
  if (!row || (!row.eligible && !row.referrer)) return null;
  const n = NOTICES.find((x) => x === notice);

  return (
    <section id="referral" aria-labelledby="referral-title" className="mt-6 max-w-xl scroll-mt-24 rounded-lg border border-gold-500/40 bg-gold-500/5 p-5">
      {!first && (
        <p className="text-gold-100">
          <span aria-hidden="true">🎁 </span>
          {t("welcome")}
        </p>
      )}
      <h2 id="referral-title" className={`${first ? "" : "mt-4 "}text-xl font-bold`}>{t("title")}</h2>
      {n && (
        <p role={n === "saved" ? "status" : "alert"} className={`mt-2 text-sm ${n === "saved" ? "text-green-300" : "text-red-300"}`}>
          {t(`notice.${n}`)}
        </p>
      )}
      {row.referrer ? (
        <p className="mt-2 text-neutral-200">
          {t("invitedBy", { nick: row.referrer })} {t(row.rewarded ? "rewarded" : "rewardLater")}
        </p>
      ) : (
        <form action={setReferral} className="mt-3">
          <input type="hidden" name="locale" value={locale} />
          <p id="referral-hint" className="text-sm text-neutral-300">{t("hint")}</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm font-semibold">
              {t("nick")}
              <input
                name="nick"
                required
                maxLength={40}
                autoComplete="off"
                spellCheck={false}
                aria-describedby="referral-hint"
                className="w-56 rounded border border-white/25 bg-neutral-900 px-3 py-2.5 font-normal outline-none focus:border-red-500"
              />
            </label>
            <button type="submit" className="min-h-11 rounded bg-red-600 px-5 font-bold text-white hover:bg-red-500">{t("save")}</button>
          </div>
          <p className="mt-2 text-xs text-neutral-400">{t("once")}</p>
        </form>
      )}
    </section>
  );
}
