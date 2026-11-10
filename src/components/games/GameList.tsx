import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { gameTitle, type UpcomingGame } from "@/lib/games";
import { joinGame, leaveGame } from "@/lib/games-actions";

export type MyStatus = "queued" | "confirmed" | "waitlist";

/**
 * Расписание. Без `me` — статичная версия (мгновенно из кеша, без кнопок);
 * с `me` — та же разметка плюс кнопки записи для конкретного посетителя.
 */
export async function GameList({
  games,
  locale,
  me,
}: {
  games: UpcomingGame[];
  locale: Locale;
  me?: { signedIn: boolean; signups: Map<number, MyStatus> };
}) {
  const t = await getTranslations({ locale, namespace: "games" });
  if (games.length === 0) return <p className="mt-10 text-neutral-400">{t("empty")}</p>;

  return (
    <ul className="mt-10 grid gap-4 sm:grid-cols-2">
      {games.map((g) => {
        const start = new Date(g.startsAt);
        const day = new Intl.DateTimeFormat(locale, {
          timeZone: g.timezone,
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(start);
        const time = new Intl.DateTimeFormat(locale, {
          timeZone: g.timezone,
          hour: "2-digit",
          minute: "2-digit",
        }).format(start);
        const late = g.lateAfter
          ? new Intl.DateTimeFormat(locale, { timeZone: g.timezone, hour: "2-digit", minute: "2-digit" }).format(
              new Date(g.lateAfter),
            )
          : null;
        const template = g.title?.[locale] ?? g.title?.cs;
        const title = template ? gameTitle(template, g.number, g.numberStyle) : t(`kind.${g.kind}`);
        const free = Math.max(g.capacity - g.confirmed, 0);
        const queueOpen = g.queueUntil !== null;
        const queueEnd = g.queueUntil
          ? new Intl.DateTimeFormat(locale, { timeZone: g.timezone, weekday: "long", hour: "2-digit", minute: "2-digit" }).format(
              new Date(new Date(g.queueUntil).getTime() - 60_000),
            )
          : null;
        const mine = me?.signups.get(g.id);

        return (
          <li
            key={g.id}
            id={`game-${g.id}`}
            className="flex flex-col rounded-lg border border-white/10 bg-neutral-950 p-5"
          >
            <p className="text-sm text-neutral-400 first-letter:uppercase">
              <time dateTime={g.startsAt}>{day}</time>
            </p>
            <h2 className="mt-1 text-2xl font-black">
              {time} · {title}
            </h2>
            {late && <p className="mt-1 text-sm text-amber-400">{t("lateFrom", { time: late })}</p>}
            {g.venue && (
              <p className="mt-3 text-sm text-neutral-300">
                {g.venue.mapsUrl ? (
                  <a href={g.venue.mapsUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                    {g.venue.name}
                  </a>
                ) : (
                  g.venue.name
                )}
                {g.venue.address && <span className="block text-neutral-500">{g.venue.address}</span>}
              </p>
            )}
            <p className="mt-3 text-sm">
              {queueOpen ? (
                <span className="text-sky-400">{t("queueOpen", { count: g.queued, until: queueEnd ?? "" })}</span>
              ) : free > 0 ? (
                <span className="text-green-400">{t("seats", { free, capacity: g.capacity })}</span>
              ) : (
                <span className="text-amber-400">{t("full", { waitlist: g.waitlist })}</span>
              )}
            </p>
            {queueOpen && <p className="mt-1 text-xs text-neutral-500">{t("queueHint")}</p>}
            {g.priceCzk !== null && (
              <p className="mt-1 text-sm text-neutral-300">
                {t("price", {
                  price: new Intl.NumberFormat(locale, { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(g.priceCzk),
                })}
              </p>
            )}
            {g.infoUrl && (
              <a href={g.infoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-sm text-neutral-300 underline hover:text-white">
                {t("info")}
              </a>
            )}
            {g.streamUrl && (
              <a href={g.streamUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-sm text-red-400 underline">
                {t("stream")}
              </a>
            )}

            <div className="mt-auto pt-5">
              {!me ? (
                <div className="h-10" aria-hidden="true" />
              ) : mine ? (
                <form action={leaveGame} className="flex items-center justify-between gap-3">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="gameId" value={g.id} />
                  <span
                    className={
                      mine === "confirmed" ? "font-semibold text-green-400"
                      : mine === "queued" ? "font-semibold text-sky-400"
                      : "font-semibold text-amber-400"
                    }
                  >
                    {mine === "confirmed" ? t("youAreIn") : mine === "queued" ? t("youAreQueued") : t("youAreWaitlisted")}
                  </span>
                  <button type="submit" className="text-sm text-neutral-400 underline hover:text-white">
                    {t("cancel")}
                  </button>
                </form>
              ) : (
                <form action={joinGame}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="gameId" value={g.id} />
                  <button
                    type="submit"
                    className="h-10 w-full rounded bg-red-600 px-4 font-semibold hover:bg-red-500"
                  >
                    {!me.signedIn ? t("signInToJoin") : queueOpen || free > 0 ? t("join") : t("joinWaitlist")}
                  </button>
                </form>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
