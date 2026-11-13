import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getArchiveSeason, type WL } from "@/lib/ratingArchive";
import { MAIN_CLUB_SLUG } from "@/lib/site";

type Props = PageProps<"/[locale]/ratings/prague/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const data = await getArchiveSeason(MAIN_CLUB_SLUG, slug);
  const t = await getTranslations({ locale, namespace: "ratingArchive" });
  if (!data) return { title: t("listTitle") };
  return {
    title: t("pageTitle", { season: data.season.title, year: data.season.year }),
    description: t("pageDescription", { season: data.season.title, year: data.season.year, games: data.season.games }),
  };
}

export default function Page({ params }: Props) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16">
      <Suspense fallback={<p className="text-neutral-500">…</p>}>
        <Inner params={params} />
      </Suspense>
    </main>
  );
}

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
const wl = (x: WL) => (x.w + x.l > 0 ? `${x.w}/${x.l}` : "—");

async function Inner({ params }: Pick<Props, "params">) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  setRequestLocale(locale);
  const data = await getArchiveSeason(MAIN_CLUB_SLUG, slug);
  if (!data) notFound();
  const { season: s, rows } = data;
  const t = await getTranslations({ locale, namespace: "ratingArchive" });
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const head = "px-2 py-2 text-right font-normal";
  const cell = "px-2 py-2 text-right tabular-nums";

  return (
    <>
      <p className="text-sm">
        <Link href="/ratings" className="text-neutral-400 hover:text-white">← {t("back")}</Link>
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
        Premier League · {s.title} <span className="text-neutral-400">({s.year})</span>
      </h1>
      <p className="mt-4 text-lg text-neutral-300">
        {t("stats", { games: s.games, civ: s.civWins, civPct: pct(s.civWins, s.games), mafia: s.mafiaWins, mafiaPct: pct(s.mafiaWins, s.games) })}
      </p>
      {s.isCurrent && s.asOf && <p className="mt-1 text-sm text-yellow-300">{t("asOf", { date: date.format(new Date(`${s.asOf}T12:00:00Z`)) })}</p>}

      <section className="mt-6 rounded-lg border border-white/10 bg-neutral-950 p-4 text-sm text-neutral-300">
        {s.formula ? <p className="whitespace-pre-line">{s.formula}</p> : null}
        <p className={s.formula ? "mt-2" : ""}>{t("qualifiedNote")}</p>
        <p className="mt-2">{t("legend")}</p>
        <p className="mt-2">
          {t("championNote")}{" "}
          <Link href="/hall-of-fame" className="underline underline-offset-4 hover:text-white">{t("hallLink")}</Link>
        </p>
      </section>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[60rem] text-left text-sm">
          <caption className="sr-only">{`Premier League · ${s.title} (${s.year})`}</caption>
          <thead className="text-neutral-400">
            <tr>
              <th className="w-10 py-2 font-normal">#</th>
              <th className="font-normal">{t("player")}</th>
              <th className={head}>{t("points")}</th>
              <th className={head}>{t("extra")}</th>
              <th className={head}>{t("games")}</th>
              <th className={head}>{t("wins")}</th>
              <th className={head} title={t("bestPlayerHint")}>{t("bestPlayer")}</th>
              <th className={head} title={t("firstKilledHint")}>{t("firstKilled")}</th>
              <th className={head} title={t("bestMove3Hint")}>{t("bestMove3")}</th>
              <th className={head} title={t("bestMove2Hint")}>{t("bestMove2")}</th>
              <th className={head}>{t("civ")}</th>
              <th className={head}>{t("mafia")}</th>
              <th className={head}>{t("sheriff")}</th>
              <th className={head}>{t("don")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((r) => (
              <tr key={r.rank} className={r.qualified ? "" : "text-neutral-500"}>
                <td className="py-2 font-mono">{r.rank}</td>
                <td className="font-semibold">
                  {r.qualified && r.rank <= 3 && <span aria-hidden="true" className="mr-1">{["🥇", "🥈", "🥉"][r.rank - 1]}</span>}
                  {r.nickname}
                </td>
                <td className={`${cell} font-mono text-base font-black ${r.qualified ? "text-white" : ""}`}>{num.format(r.points)}</td>
                <td className={cell}>{num.format(Math.round(r.extra * 100) / 100)}</td>
                <td className={cell}>{r.games}</td>
                <td className={cell}>
                  {r.wins} <span className="text-neutral-500">({pct(r.wins, r.games)})</span>
                </td>
                <td className={cell}>{r.bestPlayer || "—"}</td>
                <td className={cell}>{r.firstKilled || "—"}</td>
                <td className={cell}>{r.bestMove3 || "—"}</td>
                <td className={cell}>{r.bestMove2 || "—"}</td>
                <td className={cell}>{wl(r.civ)}</td>
                <td className={cell}>{wl(r.mafia)}</td>
                <td className={cell}>{wl(r.sheriff)}</td>
                <td className={cell}>{wl(r.don)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {s.sourceUrl && (
        <p className="mt-6 text-sm text-neutral-400">
          {t("source")}{" "}
          <a href={s.sourceUrl} target="_blank" rel="noopener" className="underline underline-offset-4 hover:text-white">the-mafia.net ↗</a>
        </p>
      )}
    </>
  );
}
