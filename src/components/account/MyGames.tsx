import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { gameTitle, type Localized } from "@/lib/games";
import { leaveGame } from "@/lib/games-actions";

type Row = {
  status: "queued" | "confirmed" | "waitlist";
  games: {
    id: number;
    starts_at: string;
    title: Localized | null;
    kind: string;
    number: number | null;
    game_schedules: { number_style: string } | null;
    venues: { name: string } | null;
    clubs: { cities: { timezone: string } | null } | null;
  };
};

/** Игры, начавшиеся до 3 часов назад, ещё показываем: вечер может идти прямо сейчас. */
function recentCutoff() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
}

/** «Мои игры» в кабинете: ближайшие записи со статусом и отменой. */
export async function MyGames({ locale, userId }: { locale: Locale; userId: string }) {
  const t = await getTranslations({ locale, namespace: "account" });
  const tg = await getTranslations({ locale, namespace: "games" });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_signups")
    .select(
      `status, games!inner ( id, starts_at, title, kind, number,
         game_schedules ( number_style ), venues ( name ), clubs ( cities ( timezone ) ) )`,
    )
    .eq("profile_id", userId)
    .in("status", ["queued", "confirmed", "waitlist"])
    .gte("games.starts_at", recentCutoff())
    .limit(20);
  if (error) console.error("MyGames failed", { code: error.code, message: error.message });

  const rows = ((data ?? []) as unknown as Row[]).sort((a, b) => a.games.starts_at.localeCompare(b.games.starts_at));
  const statusText = { confirmed: tg("youAreIn"), queued: tg("youAreQueued"), waitlist: tg("youAreWaitlisted") };
  const statusClass = { confirmed: "text-green-300", queued: "text-sky-300", waitlist: "text-gold-300" };

  return (
    <section aria-labelledby="my-games-title" className="mt-8 max-w-xl">
      <h3 id="my-games-title" className="text-lg font-bold">{t("myGames")}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-neutral-300">
          {t("myGamesEmpty")}{" "}
          <Link href="/play" className="font-semibold text-red-400 underline hover:text-red-300">{t("myGamesSchedule")}</Link>
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-white/10 rounded border border-white/10">
          {rows.map(({ status, games: g }) => {
            const tz = g.clubs?.cities?.timezone ?? "Europe/Prague";
            const when = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(g.starts_at));
            const template = g.title?.[locale] ?? g.title?.cs;
            const title = template
              ? gameTitle(template, g.number, g.game_schedules?.number_style === "roman" ? "roman" : "arabic")
              : tg(`kind.${g.kind}`);
            return (
              <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-neutral-400">
                    {when}
                    {g.venues?.name && ` · ${g.venues.name}`}
                  </p>
                  <p className={`text-sm font-semibold ${statusClass[status]}`}>{statusText[status]}</p>
                </div>
                <form action={leaveGame}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="gameId" value={g.id} />
                  <input type="hidden" name="from" value="account" />
                  <button type="submit" className="min-h-11 text-sm text-neutral-400 underline hover:text-white">
                    {t("myGamesCancel")}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
