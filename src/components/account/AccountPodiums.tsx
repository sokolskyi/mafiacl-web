import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { claimPodium } from "@/lib/podium-actions";

const NOTICES = ["sent", "invalid", "date", "too_many", "duplicate", "forbidden", "save"] as const;
const PRIZE = { 1: 30, 2: 20, 3: 10 } as const;

/** Призовые места на турнирах за MafiaCL: mafgame — сами, другие федерации — заявкой со ссылкой на результаты. */
export async function AccountPodiums({ locale, userId, notice }: { locale: Locale; userId: string; notice?: string }) {
  const t = await getTranslations({ locale, namespace: "podium" });
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournament_podiums")
    .select("id, tournament_name, federation, played_on, place, status, source, results_url")
    .eq("profile_id", userId)
    .order("played_on", { ascending: false })
    .limit(20);
  const rows = data ?? [];
  const n = NOTICES.find((x) => x === notice);
  const field = "mt-1 w-full rounded border border-white/25 bg-neutral-900 px-3 py-2.5 outline-none focus:border-red-500";

  return (
    <section id="podium" aria-labelledby="podium-title" className="mt-8 max-w-xl scroll-mt-24">
      <h2 id="podium-title" className="text-xl font-bold">{t("title")}</h2>
      <p className="mt-1 text-sm text-neutral-300">{t("hint")}</p>
      {n && (
        <p role={n === "sent" ? "status" : "alert"} className={`mt-3 text-sm ${n === "sent" ? "text-green-300" : "text-red-300"}`}>
          {t(`notice.${n}`)}
        </p>
      )}
      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-white/10 rounded border border-white/10">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
              <span>
                <span className="font-semibold">{t("placeN", { n: r.place })}</span> · {r.tournament_name}
                {r.federation && <span className="text-neutral-400"> · {r.federation}</span>}
                <span className="text-neutral-400"> · {r.played_on.split("-").reverse().join(".")}</span>
              </span>
              <span className={r.status === "approved" ? "font-semibold text-gold-200" : r.status === "rejected" ? "text-red-300" : "text-neutral-400"}>
                {r.status === "approved" ? `+${PRIZE[r.place as 1 | 2 | 3]} Respect` : t(`status.${r.status as "pending" | "rejected"}`)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <details className="mt-4 rounded border border-white/15 bg-neutral-950/50 p-4" open={n !== undefined && n !== "sent"}>
        <summary className="min-h-11 cursor-pointer content-center font-semibold">{t("claimTitle")}</summary>
        <form action={claimPodium} className="mt-3 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <label className="text-sm font-semibold sm:col-span-2">
            {t("name")}
            <input name="name" required minLength={2} maxLength={200} className={field} />
          </label>
          <label className="text-sm font-semibold">
            {t("federation")}
            <input name="federation" list="podium-federations" maxLength={60} className={field} />
            <datalist id="podium-federations">
              {["iMafia", "Emotion Games", "ФИИМ / FIIM", "Polemica", "Mafprofi"].map((f) => <option key={f} value={f} />)}
            </datalist>
          </label>
          <label className="text-sm font-semibold">
            {t("date")}
            <input name="date" type="date" required className={field} />
          </label>
          <fieldset className="text-sm sm:col-span-2">
            <legend className="font-semibold">{t("place")}</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {([1, 2, 3] as const).map((p) => (
                <label key={p} className="flex min-h-11 items-center gap-2">
                  <input type="radio" name="place" value={p} required className="h-5 w-5 accent-red-600" />
                  {t("placeOption", { n: p, prize: PRIZE[p] })}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="text-sm font-semibold sm:col-span-2">
            {t("url")}
            <input name="url" type="url" required pattern="https://.+" maxLength={500} placeholder="https://" aria-describedby="podium-url-hint" className={field} />
            <span id="podium-url-hint" className="mt-1 block text-xs font-normal text-neutral-400">{t("urlHint")}</span>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="min-h-11 rounded bg-red-600 px-5 font-bold text-white hover:bg-red-500">{t("send")}</button>
          </div>
        </form>
      </details>
    </section>
  );
}
