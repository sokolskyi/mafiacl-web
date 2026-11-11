import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatMoney, getTournament, type Registration, type Tournament } from "@/lib/tournaments";
import { loc } from "@/lib/shop/queries";
import { createClient } from "@/lib/supabase/server";
import { registerTournament, cancelTournament } from "@/lib/tournament-actions";
import { tournamentDates } from "@/components/tournaments/TournamentCards";

type Props = PageProps<"/[locale]/tournaments/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const data = await getTournament(slug);
  if (!data) return { title: "Tournament" };
  const d = data.tournament;
  return { title: d.name, description: loc(d.description, locale).slice(0, 160) || undefined, openGraph: d.coverUrl ? { images: [d.coverUrl] } : undefined };
}

export default function Page({ params, searchParams }: Props) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <Suspense fallback={<p className="text-neutral-500">…</p>}>
        <Inner params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Inner({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tournaments" });
  const data = await getTournament(slug);
  if (!data) notFound();
  const x = data.tournament;
  // У турнира своя готовая страница на нашем домене (MCL Europe, Kings) — открываем её.
  if (x.infoUrl?.startsWith("/")) redirect(x.infoUrl);
  const time = x.startsAt ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague" }).format(new Date(x.startsAt)) : null;
  const desc = loc(x.description, locale);
  const sp = await searchParams;

  return (
    <article>
      <p>
        <Link href="/tournaments" className="inline-flex min-h-11 items-center text-sm text-neutral-300 hover:underline">← {t("all")}</Link>
      </p>
      {x.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={x.coverUrl} alt="" className="mt-4 aspect-[16/9] w-full rounded-xl object-cover" />
      )}
      <p className="mt-6 flex flex-wrap gap-2 text-xs font-semibold uppercase">
        <span className="rounded bg-white/10 px-2 py-0.5">{t(`series.${x.series}`)}</span>
        {x.organizer ? <span className="rounded bg-sky-500/20 px-2 py-0.5 text-sky-200">{t("organizer", { name: x.organizer })}</span> : <span className="rounded bg-red-500/25 px-2 py-0.5 text-red-200">{t("ours")}</span>}
        <span className="rounded bg-white/10 px-2 py-0.5">{t(`status.${x.status}`)}</span>
      </p>
      <h1 className="mt-3 text-5xl sm:text-6xl">{x.name}</h1>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <div>
          <dt className="text-sm text-neutral-400">{t("when")}</dt>
          <dd className="text-lg font-semibold">{tournamentDates(x, locale)}{time && `, ${time}`}</dd>
        </div>
        {(x.venueName || x.city || x.venueAddress) && (
          <div>
            <dt className="text-sm text-neutral-400">{t("where")}</dt>
            <dd className="text-lg font-semibold">
              {[x.venueName, x.city].filter(Boolean).join(", ")}
              {x.venueAddress && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([x.venueAddress, x.city].filter(Boolean).join(", "))}`} target="_blank" rel="noopener" className="block text-sm font-normal text-neutral-300 underline">
                  {x.venueAddress}
                </a>
              )}
            </dd>
          </div>
        )}
        {x.priceCzk !== null && (
          <div>
            <dt className="text-sm text-neutral-400">{t("fee")}</dt>
            <dd className="text-lg font-semibold">{x.priceCzk === 0 ? t("free") : formatMoney(locale, x.priceCzk, x.currency)}</dd>
          </div>
        )}
        {x.prizeFund !== null && (
          <div>
            <dt className="text-sm text-neutral-400">{t("prizeFund")}</dt>
            <dd className="text-lg font-semibold">{formatMoney(locale, x.prizeFund, x.currency)}</dd>
          </div>
        )}
        {x.capacity !== null && (
          <div>
            <dt className="text-sm text-neutral-400">{t("players")}</dt>
            <dd className="text-lg font-semibold">{x.capacity}</dd>
          </div>
        )}
      </dl>

      {x.winners.length > 0 && (
        <section className="mt-10" aria-labelledby="winners">
          <h2 id="winners" className="font-display text-3xl font-extrabold uppercase">{t("winners")}</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {x.winners.slice(0, 3).map((w, i) => (
              <li key={w} className="flex items-center gap-3 rounded-lg border border-white/15 bg-neutral-950/60 p-4">
                <span aria-hidden="true" className="text-3xl">{["🥇", "🥈", "🥉"][i]}</span>
                <span className="text-lg font-bold">{w}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {desc && <div className="mt-8 max-w-prose whitespace-pre-line text-lg leading-relaxed text-neutral-200">{desc}</div>}

      {(x.infoUrl || (x.status === "finished" && x.registrationUrl)) && (
        <p className="mt-8 flex flex-wrap gap-3">
          {x.infoUrl && (
            <a href={x.infoUrl} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center rounded-full border border-white/55 px-6 font-bold hover:bg-white/10">
              {t("moreInfo")} ↗
            </a>
          )}
          {x.status === "finished" && x.registrationUrl && (
            <a href={x.registrationUrl} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center rounded-full border border-white/55 px-6 font-bold hover:bg-white/10">
              {t("results", { host: new URL(x.registrationUrl).hostname.replace(/^www\./, "") })} ↗
            </a>
          )}
        </p>
      )}

      {(x.status === "announced" || x.status === "running") && (
      <section id="registration" className="mt-12 scroll-mt-24 rounded-2xl border border-white/15 bg-neutral-950/60 p-6">
        <h2 className="font-display text-3xl font-extrabold uppercase">{t("registration")}</h2>
        {sp.reg === "ok" && <p role="status" className="mt-3 text-green-300">{t("regOk")}</p>}
        {sp.reg === "error" && <p role="alert" className="mt-3 text-red-300">{t("regError")}</p>}
        {sp.reg === "banned" && <p role="alert" className="mt-3 text-red-300">{t("regBanned")}</p>}
        <RegistrationBlock x={x} registrations={data.registrations} locale={locale} />
      </section>
      )}
    </article>
  );
}

/** Срок прошёл? Вызывается только во время запроса (после чтения сессии). */
function isPast(iso: string | null) {
  return iso ? new Date(iso).getTime() < Date.now() : false;
}

async function RegistrationBlock({ x, registrations, locale }: { x: Tournament; registrations: Registration[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "tournaments" });
  const btn = "inline-flex min-h-12 items-center rounded-full bg-red-600 px-7 font-bold text-white hover:bg-red-500";
  if (x.status !== "announced") return <p className="mt-3 text-neutral-300">{t("regClosed")}</p>;
  if (x.registration === "none") return <p className="mt-3 text-neutral-300">{t("regNone")}</p>;
  if (x.registration === "external") {
    return x.registrationUrl ? (
      <div className="mt-4">
        <a href={x.registrationUrl} target="_blank" rel="noopener" className={btn}>
          {t("regExternal", { host: new URL(x.registrationUrl).hostname.replace(/^www\./, "") })} ↗
        </a>
      </div>
    ) : (
      <p className="mt-3 text-neutral-300">{t("regNone")}</p>
    );
  }

  // Регистрация у нас: кто вошёл и записан ли — узнаём во время запроса.
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims.sub;
  const mine = uid ? registrations.find((r) => r.profileId === uid) : undefined;
  const closed = isPast(x.registrationClosesAt);
  const registered = registrations.filter((r) => r.status === "registered");
  const waitlist = registrations.filter((r) => r.status === "waitlist");

  return (
    <div className="mt-4 space-y-6">
      <p className="text-neutral-300">
        {x.capacity ? t("seats", { taken: registered.length, capacity: x.capacity }) : t("registeredCount", { count: registered.length })}
        {x.registrationClosesAt && ` · ${t("closesAt", { date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague" }).format(new Date(x.registrationClosesAt)) })}`}
      </p>
      {mine ? (
        <form action={cancelTournament} className="flex flex-wrap items-center gap-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="tournamentId" value={x.id} />
          <input type="hidden" name="slug" value={x.slug} />
          <span className="font-semibold text-green-300">{mine.status === "waitlist" ? t("youWaitlist") : t("youRegistered")}</span>
          <button className="min-h-11 text-sm text-neutral-400 underline hover:text-white">{t("cancel")}</button>
        </form>
      ) : closed ? (
        <p className="text-neutral-300">{t("regClosed")}</p>
      ) : uid ? (
        <form action={registerTournament}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="tournamentId" value={x.id} />
          <input type="hidden" name="slug" value={x.slug} />
          <button className={btn}>{t("register")}</button>
        </form>
      ) : (
        <Link href="/account" className={btn}>{t("signInToRegister")}</Link>
      )}
      {registered.length > 0 && (
        <div>
          <h3 className="font-bold">{t("participants")}</h3>
          <ol className="mt-2 flex flex-wrap gap-2">
            {registered.map((r, i) => (
              <li key={r.profileId} className="rounded-full bg-white/10 px-3 py-1 text-sm">
                {i + 1}. {r.nickname}
              </li>
            ))}
          </ol>
        </div>
      )}
      {waitlist.length > 0 && (
        <div>
          <h3 className="font-bold">{t("waitlist")}</h3>
          <ol className="mt-2 flex flex-wrap gap-2">
            {waitlist.map((r) => (
              <li key={r.profileId} className="rounded-full border border-white/20 px-3 py-1 text-sm text-neutral-300">{r.nickname}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
