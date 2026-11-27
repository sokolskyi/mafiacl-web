import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { decidePodium } from "@/lib/podium-actions";

/** Заявки игроков на Respect за призовое место (другие федерации): открыть результаты, проверить клуб и место. */
export async function PodiumClaims({ locale, notice }: { locale: Locale; notice?: string }) {
  const t = await getTranslations({ locale, namespace: "podium.admin" });
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournament_podiums")
    .select("id, tournament_name, federation, played_on, place, results_url, created_at, profiles!tournament_podiums_profile_id_fkey ( nickname )")
    .eq("status", "pending")
    .order("created_at")
    .limit(50);
  const rows = data ?? [];
  return (
    <section id="podiums" className="scroll-mt-24">
      <h2 className="text-xl font-bold">
        {t("title")} {rows.length > 0 && <span className="ml-2 rounded-full bg-red-600 px-2.5 py-0.5 text-sm">{rows.length}</span>}
      </h2>
      <p className="mt-1 text-sm text-neutral-400">{t("hint")}</p>
      {notice && (
        <p role={notice === "error" ? "alert" : "status"} className={`mt-3 ${notice === "error" ? "text-red-400" : "text-green-400"}`}>
          {t(notice === "approved" ? "approved" : notice === "rejected" ? "rejected" : "error")}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="mt-4 text-neutral-400">{t("empty")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10 rounded border border-white/10">
          {rows.map((r) => {
            const nick = (r.profiles as unknown as { nickname: string | null } | null)?.nickname ?? "—";
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {nick} · {t("place", { n: r.place })}
                  </p>
                  <p className="text-sm text-neutral-300">
                    {r.tournament_name}
                    {r.federation && ` · ${r.federation}`} · {r.played_on.split("-").reverse().join(".")}
                  </p>
                  <a href={r.results_url ?? "#"} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-red-300 underline">
                    {t("open")}
                  </a>
                </div>
                <form action={decidePodium} className="flex gap-2">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={r.id} />
                  <button name="decision" value="approve" className="min-h-11 rounded bg-green-700 px-4 text-sm font-semibold hover:bg-green-600">{t("approve")}</button>
                  <button name="decision" value="reject" className="min-h-11 rounded border border-white/30 px-4 text-sm font-semibold hover:bg-white/10">{t("reject")}</button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
