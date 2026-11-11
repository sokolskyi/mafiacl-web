import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { gameTitle } from "@/lib/games";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getPlayerOfWeek } from "@/lib/rating";
import { getBadges, withBadge } from "@/lib/badges";

/** Победитель последнего мини-турнира — «Игрок недели». */
export async function PlayerOfWeek({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home" });
  const data = await getPlayerOfWeek(MAIN_CLUB_SLUG);
  if (!data) return null;
  const badges = await getBadges(MAIN_CLUB_SLUG);
  const w0 = data.winners[0];
  const tpl = w0.title?.[locale] ?? w0.title?.cs;
  const title = tpl ? gameTitle(tpl, w0.gameNumber, "roman") : data.rating.name;
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "Europe/Prague" }).format(new Date(w0.startsAt));
  const num = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);

  return (
    <section aria-labelledby="potw" className="mt-16 rounded-lg bg-white p-7 text-black">
      <h2 id="potw" className="text-xs font-bold uppercase tracking-[0.2em]">⚜️ {t("playerOfWeek")}</h2>
      <ul className="mt-4 flex flex-wrap gap-6">
        {data.winners.map((w) => {
          const face = w.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={w.avatarUrl} alt="" width={80} height={80} referrerPolicy="no-referrer" className="h-20 w-20 rounded-full object-cover ring-2 ring-black" />
          ) : (
            <span aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full bg-black text-3xl font-black text-white ring-2 ring-black">
              {(w.nickname ?? w.name).slice(0, 1).toUpperCase()}
            </span>
          );
          const name = <span className="font-display text-5xl font-extrabold uppercase leading-none">{withBadge(badges, w.profileId, w.nickname ?? w.name)}</span>;
          return (
            <li key={`${w.profileId ?? w.name}`} className="flex items-center gap-4">
              {face}
              <div>
                {w.nickname ? (
                  <Link href={{ pathname: "/players/[nick]", params: { nick: w.nickname } }} className="hover:underline">{name}</Link>
                ) : name}
                <p className="mt-1 text-sm text-neutral-800">{t("winnerOf", { title, date })}</p>
                <p className="text-sm text-neutral-800">{t("winnerStats", { points: num(w.points), wins: w.wins, games: w.games })}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
