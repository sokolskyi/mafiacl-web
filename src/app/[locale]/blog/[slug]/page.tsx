import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { MAIN_CLUB_SLUG, NOINDEX } from "@/lib/site";
import { getReview } from "@/lib/reviews/queries";
import { analyze } from "@/lib/reviews/analyze";
import { KINGS_ZONE } from "@/lib/reviews/types";
import { dayMonth, daysBetween, fmtNum, fullDate, monthTitle } from "@/components/reviews/format";
import { getApprovedPost, paragraphs, postIdOf } from "@/lib/blog-posts";

const monthOf = (slug: string) => /^season-review-(\d{4}-\d{2})$/.exec(slug)?.[1] ?? null;

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const postId = postIdOf(slug);
  if (postId) {
    const post = await getApprovedPost(postId);
    if (!post) return {};
    return {
      title: post.title,
      description: paragraphs(post.body)[0]?.slice(0, 160),
      alternates: alternatesFor({ pathname: "/blog/[slug]", params: { slug } }, locale),
      robots: NOINDEX ? { index: false, follow: false } : undefined,
    };
  }
  const month = monthOf(slug);
  if (!month) return {};
  const t = await getTranslations({ locale, namespace: "reviews" });
  const title = t("title", { month: monthTitle(month, locale) });
  return {
    title,
    description: t("metaDescription", { month: monthTitle(month, locale) }),
    alternates: alternatesFor({ pathname: "/blog/[slug]", params: { slug } }, locale),
    robots: NOINDEX ? { index: false, follow: false } : undefined,
  };
}

export default function Page({ params }: PageProps<"/[locale]/blog/[slug]">) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <Suspense fallback={<p className="text-neutral-500">…</p>}>
        <Review params={params} />
      </Suspense>
    </main>
  );
}

async function Review({ params }: Pick<PageProps<"/[locale]/blog/[slug]">, "params">) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  setRequestLocale(locale);
  const postId = postIdOf(slug);
  if (postId) return <Post id={postId} locale={locale} />;
  const month = monthOf(slug);
  if (!month) notFound();
  const found = await getReview(MAIN_CLUB_SLUG, month);
  if (!found) notFound();
  const { review, previous } = found;
  const t = await getTranslations({ locale, namespace: "reviews" });
  const insights = analyze(review, previous);
  const k = review.kings;
  const h2 = "font-display text-3xl font-extrabold uppercase";

  return (
    <>
      <p>
        <Link href="/blog" className="text-sm text-neutral-400 hover:text-white">← {t("back")}</Link>
      </p>
      <p className="mt-6 text-sm uppercase tracking-widest text-red-300">{t("kicker")}</p>
      <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{t("title", { month: monthTitle(month, locale) })}</h1>
      <p className="mt-3 text-neutral-400">
        {review.partial ? t("asOfPartial", { date: fullDate(review.asOf, locale) }) : t("asOfFinal", { date: fullDate(review.asOf, locale) })}
        {previous && ` · ${t("comparedWith", { month: monthTitle(previous.month, locale) })}`}
      </p>

      {k && (
        <section aria-labelledby="season" className="mt-10 rounded-lg border border-red-500/40 bg-neutral-950/60 p-6">
          <h2 id="season" className={h2}>{t("seasonTitle", { title: k.title })}</h2>
          <ul className="mt-4 space-y-2 text-lg text-neutral-200">
            {k.eventTitle && k.eventFrom && (
              <li>
                {t("kingsEvent", {
                  title: k.eventTitle,
                  date: fullDate(k.eventFrom, locale),
                  days: Math.max(0, daysBetween(review.asOf, k.eventFrom)),
                })}
                {k.prizeEur ? ` ${t("kingsPrize", { prize: fmtNum(k.prizeEur, locale) })}` : ""}
              </li>
            )}
            {k.premierGames !== null && k.arenaGames !== null && (
              <li>{t("gamesPlayed", { premier: k.premierGames, arena: k.arenaGames })}</li>
            )}
            {k.clubTournaments !== null && k.uniquePlayers !== null && (
              <li>{t("tournamentsPlayers", { tournaments: k.clubTournaments, players: k.uniquePlayers })}</li>
            )}
          </ul>
        </section>
      )}

      {insights.map((ins) => (
        <section key={ins.key} aria-labelledby={`r-${ins.key}`} className="mt-14">
          <h2 id={`r-${ins.key}`} className={h2}>{t(`rankings.${ins.key}.title`)}</h2>
          <p className="mt-1 text-neutral-400">{t(`rankings.${ins.key}.about`)}</p>
          <ul className="mt-4 space-y-2 text-lg text-neutral-200">
            <li>
              {ins.previousLeader
                ? t("newLeader", { name: ins.leader.n, previous: ins.previousLeader, value: fmtNum(ins.leader.v, locale) })
                : t("leader", { name: ins.leader.n, value: fmtNum(ins.leader.v, locale) })}
            </li>
            {ins.climber && <li>{t("climber", { name: ins.climber.n, from: ins.climber.from, to: ins.climber.to })}</li>}
            {ins.newcomers.length > 0 && <li>{t("newcomers", { names: ins.newcomers.join(", "), count: ins.newcomers.length })}</li>}
            <li>{t("zone", { count: KINGS_ZONE[ins.key], names: ins.zone.join(", ") })}</li>
          </ul>
          <div className="mt-5 overflow-x-auto rounded border border-white/15">
            <table className="w-full text-left">
              <caption className="sr-only">{t(`rankings.${ins.key}.title`)}</caption>
              <thead className="bg-white/5 text-sm text-neutral-400">
                <tr>
                  <th scope="col" className="px-3 py-2">#</th>
                  <th scope="col" className="px-3 py-2">{t("colPlayer")}</th>
                  <th scope="col" className="px-3 py-2 text-right">{t(`rankings.${ins.key}.value`)}</th>
                  <th scope="col" className="px-3 py-2 text-right">{t(`rankings.${ins.key}.count`)}</th>
                  {previous && <th scope="col" className="px-3 py-2 text-right">{t("colMove")}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {ins.rows.map((r) => (
                  <tr key={r.n} className={r.r <= KINGS_ZONE[ins.key] ? "bg-red-950/40" : undefined}>
                    <td className="px-3 py-2 font-bold">{r.r}</td>
                    <td className="px-3 py-2 font-semibold">{r.n}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(r.v, locale)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-400">{r.c ?? "—"}</td>
                    {previous && (
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.isNew ? (
                          <span className="text-amber-300">{t("moveNew")}</span>
                        ) : r.delta && r.delta > 0 ? (
                          <span className="text-green-400">▲ {r.delta}</span>
                        ) : r.delta && r.delta < 0 ? (
                          <span className="text-red-400">▼ {-r.delta}</span>
                        ) : (
                          <span className="text-neutral-500">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {review.mcl && (review.mcl.series.length > 0 || review.mcl.squad.length > 0) && (
        <section aria-labelledby="mcl" className="mt-14">
          <h2 id="mcl" className={h2}>{t("mclTitle", { year: review.mcl.year })}</h2>
          {review.mcl.series.length > 0 ? (
            <ul className="mt-4 space-y-2 text-lg text-neutral-200">
              {review.mcl.series.map((s) => (
                <li key={`${s.date}-${s.city}`}>
                  {t(s.semi ? "mclSemi" : "mclSeries", { date: dayMonth(s.date, locale), city: s.city, name: s.winner, score: fmtNum(s.score, locale) })}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-lg text-neutral-300">{t("mclNoSeries")}</p>
          )}
          {review.mcl.squad.length > 0 && (
            <p className="mt-4 text-lg text-neutral-200">{t("mclSquad", { count: review.mcl.squad.length, names: review.mcl.squad.map((s) => s.n).join(", ") })}</p>
          )}
          {review.mcl.finalISO && review.mcl.finalISO.slice(0, 10) >= review.asOf && (
            <p className="mt-2 text-lg text-neutral-200">{t("mclFinal", { date: fullDate(review.mcl.finalISO, locale) })}</p>
          )}
          <p className="mt-4">
            {/* Старый раздел MCL проксируется как есть — нужна полная загрузка страницы, не клиентский переход. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/mcl/" className="text-red-300 underline underline-offset-4 hover:text-white">{t("mclLink")}</a>
          </p>
        </section>
      )}

      <p className="mt-14 border-t border-white/10 pt-6 text-neutral-400">
        {t("footer")}{" "}
        <Link href="/kings" className="underline underline-offset-4 hover:text-white">{t("kingsLink")}</Link>
      </p>
    </>
  );
}

/** Статья игрока (одобрена админом). Текст — простые абзацы, без HTML. */
async function Post({ id, locale }: { id: number; locale: Locale }) {
  const post = await getApprovedPost(id);
  if (!post) notFound();
  const t = await getTranslations({ locale, namespace: "blogPosts" });
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague" }).format(new Date(post.approvedAt));
  return (
    <article lang={post.lang}>
      <p>
        <Link href="/blog" className="text-sm text-neutral-400 hover:text-white">← {t("back")}</Link>
      </p>
      <p className="mt-6 text-sm uppercase tracking-widest text-red-300">{t("kicker")}</p>
      <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{post.title}</h1>
      <p className="mt-3 text-neutral-400">
        {post.author ? (
          <Link href={{ pathname: "/players/[nick]", params: { nick: post.author } }} className="font-semibold text-neutral-200 hover:underline">{post.author}</Link>
        ) : "—"}
        {" · "}{date}
      </p>
      <div className="mt-8 max-w-prose space-y-5 text-lg leading-relaxed text-neutral-200">
        {paragraphs(post.body).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
      </div>
    </article>
  );
}
