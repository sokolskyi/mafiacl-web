import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { markFeedback } from "@/lib/feedback-actions";

/** Отзывы игроков из личного кабинета — для владельца и админов клуба. */
export async function FeedbackAdmin({ locale, clubIds }: { locale: Locale; clubIds: number[] }) {
  const t = await getTranslations({ locale, namespace: "admin.feedback" });
  const { data, error } = await createAdminClient()
    .from("player_feedback")
    .select("id, body, created_at, read_at, profiles!player_feedback_profile_id_fkey ( nickname, display_name )")
    .in("club_id", clubIds)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) console.error("feedback list failed", { code: error.code, message: error.message });
  const rows = (data ?? []).map((r) => ({ ...r, who: r.profiles as unknown as { nickname: string | null; display_name: string | null } | null }));
  const unread = rows.filter((r) => !r.read_at).length;
  const fmt = (d: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague" }).format(new Date(d));
  return (
    <section id="feedback" aria-labelledby="feedback-title">
      <h2 id="feedback-title" className="text-xl font-bold">
        {t("title")}
        {unread > 0 && <span className="ml-3 rounded-full bg-red-600 px-2.5 py-0.5 align-middle text-sm">{t("unread", { n: unread })}</span>}
      </h2>
      <p className="mt-1 text-sm text-neutral-400">{t("hint")}</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">{t("empty")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10 rounded border border-white/10">
          {rows.map((r) => (
            <li key={r.id} className={`px-4 py-3 ${r.read_at ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {!r.read_at && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-red-500" />}
                {r.who?.nickname ? (
                  <Link href={{ pathname: "/players/[nick]", params: { nick: r.who.nickname } }} className="font-semibold hover:text-red-300">{r.who.nickname}</Link>
                ) : (
                  <span className="font-semibold">{r.who?.display_name ?? "—"}</span>
                )}
                <span className="text-neutral-500">{fmt(r.created_at)}</span>
                <form action={markFeedback} className="ml-auto">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="read" value={r.read_at ? "0" : "1"} />
                  <button type="submit" className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">{r.read_at ? t("markUnread") : t("markRead")}</button>
                </form>
              </div>
              <p className="mt-2 whitespace-pre-line">{r.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
