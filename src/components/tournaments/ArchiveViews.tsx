import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ARCHIVE, archiveItem, archiveStagesOf, archiveYear, type ArchiveGame, type ArchiveItem, type ArchiveStage, type ArchiveTournament } from "@/lib/fiimArchive";
import { brandOf } from "@/lib/tournamentBrands";
import { getKnownPlayers } from "@/lib/playerNames";
import { playerLinks } from "@/components/players/PlayerNameLink";

const MEDALS = ["🥇", "🥈", "🥉"];
const TOTAL = new Set(["Итоговый Кф", "Б", "Σ"]);

function dateOf(date: string, locale: Locale, approx = false) {
  if (approx) return date.slice(0, 4);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function ArchiveLink({ item, className }: { item: ArchiveItem; className?: string }) {
  return (
    <Link href={{ pathname: "/tournaments/archive/[key]", params: { key: item.key } }} className={className ?? "underline decoration-white/30 underline-offset-4 hover:decoration-white"}>
      {item.name}
    </Link>
  );
}

/** Список архива по годам: розыгрыши турниров, этапы — внутри своего финала. */
export async function ArchiveIndex({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "tournaments" });
  const known = await getKnownPlayers();
  const main = ARCHIVE.filter((x) => !x.parent && (x.ours || !x.stage));
  const years = [...new Set(main.map(archiveYear))].sort((a, z) => z - a);

  return (
    <article>
      <p>
        <Link href="/tournaments" className="inline-flex min-h-11 items-center text-sm text-neutral-300 hover:underline">← {t("all")}</Link>
      </p>
      <h1 className="mt-2 text-5xl sm:text-6xl">{t("archive.title")}</h1>
      <p className="mt-4 max-w-3xl text-lg text-neutral-200">{t("archive.lead")}</p>
      {years.map((year) => (
        <section key={year} className="mt-12" aria-labelledby={`y${year}`}>
          <h2 id={`y${year}`} className="font-display text-3xl font-extrabold uppercase">{year}</h2>
          <ul className="mt-4 divide-y divide-white/10 rounded-lg border border-white/15">
            {main
              .filter((x) => archiveYear(x) === year)
              .map((x) => {
                const stages = archiveStagesOf(x.key);
                return (
                  <li key={x.key} className="px-4 py-4">
                    <p className="text-lg font-bold">
                      <ArchiveLink item={x} />
                      <span className="ml-2 text-sm font-normal text-neutral-400">· {x.city} · {dateOf(x.date, locale, x.approx_date)}</span>
                    </p>
                    {x.top.length > 0 ? (
                      <p className="mt-1 text-neutral-200">
                        {x.top.map((p, i) => (
                          <span key={i} className="mr-4 inline-block">{MEDALS[i]} {playerLinks(p, known)}</span>
                        ))}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-neutral-400">{t("archive.noResults")}</p>
                    )}
                    {!x.ours && <p className="mt-1 text-sm text-neutral-400">{t("archive.leagueFinal")}</p>}
                    {stages.length > 0 && <p className="mt-1 text-sm text-neutral-400">{t("archive.stagesCount", { count: stages.length })}</p>}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </article>
  );
}

function StageTable({ stage, known, label, t }: { stage: ArchiveStage; known: Record<string, string>; label: string; t: (k: string) => string }) {
  const cols = stage.columns.slice(2);
  const num = (v: number | string | null) => (v === null ? "" : typeof v === "number" ? String(v) : v);
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-white/15" role="region" aria-label={label} tabIndex={0}>
      <table className="w-full min-w-max text-sm tabular-nums">
        <thead className="bg-neutral-900 text-left text-neutral-300">
          <tr>
            <th scope="col" className="px-3 py-2 text-right">№</th>
            <th scope="col" className="px-3 py-2">{t("archive.player")}</th>
            {cols.map((c) => (
              <th key={c} scope="col" className={`px-3 py-2 text-right ${TOTAL.has(c) ? "text-white" : ""}`}>{c.replace(/^Доп\.баллы /, "")}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {stage.rows.map((r, i) => (
            <tr key={i} className={typeof r.place === "number" && r.place <= 3 ? "bg-white/[0.03]" : undefined}>
              <td className="px-3 py-2 text-right text-neutral-400">{r.place}</td>
              <th scope="row" className="px-3 py-2 text-left font-semibold">
                {playerLinks(r.nick, known)}
                {r.penalty !== null && <span className="ml-1 font-normal text-red-300">({t("archive.penalty")} {r.penalty})</span>}
                {r.club && <span className="block text-xs font-normal text-neutral-400">{r.club}</span>}
              </th>
              {cols.map((c) => (
                <td key={c} className={`px-3 py-2 text-right ${TOTAL.has(c) ? "font-bold" : "text-neutral-200"}`}>{num(r.values[c] ?? null)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ROLE_CLASS: Record<string, string> = { mafia: "text-red-300", don: "text-red-300 font-semibold", sheriff: "font-semibold text-sky-300", citizen: "text-neutral-300" };

function StageGames({ games, total, known, locale, t }: { games: ArchiveGame[]; total: number; known: Record<string, string>; locale: Locale; t: (k: string, v?: Record<string, string | number>) => string }) {
  return (
    <details className="mt-3 rounded-lg border border-white/15 bg-neutral-950/40">
      <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold">
        {t("archive.games")} · {games.length === total ? games.length : t("archive.gamesSaved", { saved: games.length, total })}
      </summary>
      <div className="grid gap-4 p-4 pt-1 lg:grid-cols-2">
        {games.map((g) => (
          <section key={g.id} className="rounded border border-white/10" aria-label={t("archive.game", { n: g.number })}>
            <h3 className="flex flex-wrap gap-x-3 border-b border-white/10 px-3 py-2 text-sm">
              <span className="font-bold">{t("archive.game", { n: g.number })}</span>
              {g.date && <span className="text-neutral-400">{dateOf(g.date, locale)}</span>}
              {g.winner && (
                <span className={g.winner === "mafia" ? "text-red-300" : "text-sky-300"}>{t(g.winner === "mafia" ? "archive.winMafia" : "archive.winTown")}</span>
              )}
              {g.host && <span className="text-neutral-400">{t("archive.host")}: {g.host}</span>}
            </h3>
            <div className="overflow-x-auto" role="region" aria-label={t("archive.game", { n: g.number })} tabIndex={0}>
              <table className="w-full min-w-max text-sm tabular-nums">
                <thead className="text-left text-xs text-neutral-400">
                  <tr>
                    <th scope="col" className="px-3 py-1 text-right">№</th>
                    <th scope="col" className="px-3 py-1">{t("archive.player")}</th>
                    <th scope="col" className="px-3 py-1">{t("archive.role")}</th>
                    <th scope="col" className="px-3 py-1">{t("archive.notesCol")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {g.players.map((p) => (
                    <tr key={p.seat}>
                      <td className="px-3 py-1 text-right text-neutral-400">{p.seat}</td>
                      <th scope="row" className="px-3 py-1 text-left font-semibold">{playerLinks(p.nick, known)}</th>
                      <td className={`px-3 py-1 ${ROLE_CLASS[p.role ?? "citizen"]}`}>{p.role ? t(`archive.roles.${p.role}`) : ""}</td>
                      <td className="px-3 py-1 text-xs text-neutral-300">
                        {[
                          p.best ? t("archive.best", { n: p.best }) : null,
                          p.killed_first ? (p.best_move ? t("archive.killedMove", { move: p.best_move.join(", ") }) : t("archive.killed")) : null,
                          p.fouls ? t("archive.fouls", { n: p.fouls }) : null,
                          p.penalty ? t("archive.penalties", { n: p.penalty }) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </details>
  );
}

/** Страница одного турнира из архива: таблицы этапов, этапы серии, расшифровка колонок. */
export async function ArchiveTournamentView({ data, locale }: { data: ArchiveTournament; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "tournaments" });
  const known = await getKnownPlayers();
  const item = archiveItem(data.key);
  const parent = item?.parent ? archiveItem(item.parent) : null;
  const stages = archiveStagesOf(data.key);
  const brand = brandOf((parent ?? item ?? data).name);
  const tr = (k: string) => t(k);

  return (
    <article>
      <p className="flex flex-wrap gap-x-6">
        {brand && (
          <Link href={{ pathname: "/tournaments/[slug]", params: { slug: brand.slug } }} className="inline-flex min-h-11 items-center text-sm text-neutral-300 hover:underline">
            ← {t(`brands.${brand.key}.name`)}
          </Link>
        )}
        <Link href="/tournaments/archive" className="inline-flex min-h-11 items-center text-sm text-neutral-300 hover:underline">{t("archive.title")}</Link>
      </p>
      <h1 className="mt-2 text-4xl sm:text-5xl">{data.name}</h1>
      <p className="mt-3 text-lg text-neutral-200">
        {data.city} · {dateOf(data.date, locale, data.approx_date)}
      </p>
      {parent && (
        <p className="mt-2 text-neutral-300">
          {t("archive.partOf")}: <ArchiveLink item={parent} />
        </p>
      )}
      {!data.ours && <p className="mt-3 max-w-3xl rounded border border-white/15 bg-neutral-900 px-4 py-3 text-sm text-neutral-300">{t("archive.league")}</p>}
      {data.notes?.length ? (
        <ul className="mt-4 max-w-3xl list-disc space-y-1 pl-5 text-sm text-neutral-300">
          {data.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      ) : null}

      {data.stages.length === 0 && <p className="mt-8 text-neutral-300">{t("archive.noResults")}</p>}
      {data.stages.map((s, i) => (
        <section key={i} className="mt-10" aria-labelledby={`s${i}`}>
          <h2 id={`s${i}`} className="font-display text-3xl font-extrabold uppercase">{s.title}</h2>
          {s.note && <p className="mt-1 text-sm text-neutral-400">{s.note}</p>}
          <StageTable stage={s} known={known} label={s.title} t={tr} />
          {s.games?.length ? <StageGames games={s.games} total={s.games_total ?? s.games.length} known={known} locale={locale} t={t} /> : null}
        </section>
      ))}

      {stages.length > 0 && (
        <section className="mt-12" aria-labelledby="stages">
          <h2 id="stages" className="font-display text-3xl font-extrabold uppercase">{t("archive.stages")}</h2>
          <ul className="mt-4 divide-y divide-white/10 rounded-lg border border-white/15">
            {stages.map((x) => (
              <li key={x.key} className="px-4 py-3">
                <ArchiveLink item={x} />
                <span className="ml-2 text-sm text-neutral-400">· {dateOf(x.date, locale, x.approx_date)}</span>
                {x.top[0] && <span className="ml-2 text-sm">🥇 {playerLinks(x.top[0], known)}</span>}
                {!x.ours && <span className="ml-2 text-xs text-neutral-400">({t("archive.otherClub")})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {Object.keys(data.legend).length > 0 && (
        <section className="mt-12" aria-labelledby="legend">
          <h2 id="legend" className="text-xl font-bold">{t("archive.legend")}</h2>
          <dl className="mt-3 grid max-w-3xl gap-x-4 gap-y-1 text-sm text-neutral-300 sm:grid-cols-[auto_1fr]">
            {Object.entries(data.legend).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-bold text-white">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <p className="mt-10 text-sm text-neutral-400">
        {t("archive.source")}:{" "}
        {data.url ? (
          <a href={data.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
            {data.source === "fiim.world" ? "fiim.world" : t("archive.sourceOldSite")}
          </a>
        ) : (
          t("archive.sourceVk")
        )}
        . {t("archive.copy")}
      </p>
    </article>
  );
}
