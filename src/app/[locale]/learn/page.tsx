import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { BASICS, SCHOOL, SEVEN } from "@/lib/learnVideos";

export async function generateMetadata({ params }: PageProps<"/[locale]/learn">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "learn", href: "/learn" });
}

const FIRST = ["0", "1", "2", "3"] as const;
const ROLES = ["civilian", "sheriff", "mafia", "don"] as const;
const FLOW = ["0", "1", "2", "3", "4"] as const;
const ETIQUETTE = ["0", "1", "2", "3", "4", "5"] as const;

export default async function Page({ params }: PageProps<"/[locale]/learn">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "learn" });
  const p = await getTranslations({ locale, namespace: "pages" });
  const h2 = "font-display text-4xl font-extrabold uppercase sm:text-5xl";
  const card = "rounded-lg border border-white/15 bg-neutral-950/50 p-5";
  const thumb = (v: string) => `https://i.ytimg.com/vi/${v}/hqdefault.jpg`;
  const watch = (v: string, playlist: string) => `https://www.youtube.com/watch?v=${v}&list=${playlist.split("list=")[1]}`;
  const pill = "inline-flex min-h-11 items-center rounded-full border border-white/55 px-5 font-bold hover:bg-white/10";

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-5xl sm:text-7xl">{p("learn.title")}</h1>
      <p className="mt-6 max-w-2xl text-xl text-neutral-200">{t("lead")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/play" className="inline-flex min-h-12 items-center rounded-full bg-red-600 px-7 font-bold text-white hover:bg-red-500">
          {t("ctaPlay")}
        </Link>
        <Link href="/faq" className="inline-flex min-h-12 items-center rounded-full border border-white/55 px-7 font-bold hover:bg-white/10">
          {t("ctaFaq")}
        </Link>
      </div>

      <section className="mt-20" aria-labelledby="first">
        <h2 id="first" className={h2}>{t("firstTitle")}</h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FIRST.map((k, i) => (
            <li key={k} className={card}>
              <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-white font-display text-2xl font-extrabold text-black">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold">{t(`first.${k}.title`)}</h3>
              <p className="mt-2 text-sm text-neutral-300">{t(`first.${k}.text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-20 rounded-2xl border border-white/15 bg-neutral-950/50 p-6 sm:p-10" aria-labelledby="what">
        <h2 id="what" className={h2}>{t("whatTitle")}</h2>
        <p className="mt-4 max-w-3xl text-lg text-neutral-200">{t("what")}</p>
      </section>

      <section className="mt-20" aria-labelledby="roles">
        <h2 id="roles" className={h2}>{t("rolesTitle")}</h2>
        <p className="mt-3 text-neutral-300">{t("rolesLead")}</p>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((k) => (
            <li key={k} className={`${card} ${k === "mafia" || k === "don" ? "border-red-500/40" : ""}`}>
              <p className="text-sm text-neutral-400">{t(`roles.${k}.team`)}</p>
              <h3 className="mt-1 text-xl font-bold">{t(`roles.${k}.title`)}</h3>
              <p className="mt-2 text-sm text-neutral-300">{t(`roles.${k}.text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20" aria-labelledby="flow">
        <h2 id="flow" className={h2}>{t("flowTitle")}</h2>
        <ol className="mt-8 space-y-6">
          {FLOW.map((k, i) => (
            <li key={k} className="flex gap-4">
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/40 font-display text-2xl font-extrabold">
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-bold">{t(`flow.${k}.title`)}</h3>
                <p className="max-w-prose text-neutral-300">{t(`flow.${k}.text`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-20" aria-labelledby="videos">
        <h2 id="videos" className={h2}>{t("videos.title")}</h2>
        <p className="mt-3 max-w-3xl text-neutral-300">{t("videos.lead")}</p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <a href={SCHOOL.playlist} target="_blank" rel="noopener" className="group overflow-hidden rounded-lg border border-white/15 bg-neutral-950/60 hover:border-red-500/70">
            <div className="relative aspect-video bg-neutral-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(SCHOOL.cover)} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 group-hover:opacity-100" />
              <span className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-0.5 text-xs font-semibold">▶ {t("videos.count", { n: SCHOOL.count })}</span>
            </div>
            <div className="p-5">
              <h3 className="text-xl font-bold">{t("videos.schoolTitle")} ↗</h3>
              <p className="mt-2 text-sm text-neutral-300">{t("videos.schoolText")}</p>
            </div>
          </a>

          <div className="rounded-lg border border-white/15 bg-neutral-950/60 p-5">
            <h3 className="text-xl font-bold">{t("videos.basicsTitle")}</h3>
            <p className="mt-2 text-sm text-neutral-300">{t("videos.basicsText")}</p>
            <ol className="mt-4 flex flex-wrap gap-2">
              {BASICS.items.map((x, i) => (
                <li key={x.v}>
                  <a href={watch(x.v, BASICS.playlist)} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/25 px-3 text-sm hover:border-red-500/70 hover:bg-white/5">
                    <span className="font-mono text-xs text-neutral-500">{i + 1}</span>
                    {t(`videos.topics.${x.key}`)}
                  </a>
                </li>
              ))}
            </ol>
            <p className="mt-4">
              <a href={BASICS.playlist} target="_blank" rel="noopener" className={pill}>{t("videos.playlist")} ↗</a>
            </p>
          </div>
        </div>

        <h3 className="mt-12 font-display text-3xl font-extrabold uppercase">{t("videos.sevenTitle")}</h3>
        <p className="mt-2 max-w-3xl text-neutral-300">{t("videos.sevenText")}</p>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {SEVEN.items.map((x) => (
            <li key={x.v}>
              <a href={watch(x.v, SEVEN.playlist)} target="_blank" rel="noopener" className="group block overflow-hidden rounded-lg border border-white/15 bg-neutral-950/60 hover:border-red-500/70">
                <div className="relative aspect-video bg-neutral-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb(x.v)} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 group-hover:opacity-100" />
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 font-mono text-xs">{x.length}</span>
                </div>
                <p className="px-3 py-2 font-semibold">{x.author}</p>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <a href={SEVEN.playlist} target="_blank" rel="noopener" className={pill}>{t("videos.playlist")} ↗</a>
        </p>
      </section>

      <section className="mt-20" aria-labelledby="etiquette">
        <h2 id="etiquette" className={h2}>{t("etiquetteTitle")}</h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {ETIQUETTE.map((k) => (
            <li key={k} className="flex gap-3 text-lg">
              <span aria-hidden="true" className="text-red-400">✦</span>
              <span>{t(`etiquette.${k}`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-neutral-400">
          {t("codeNote")}{" "}
          <Link href="/about/code" className="underline underline-offset-4 hover:text-white">{t("codeLink")}</Link>
        </p>
      </section>

      <section className="mt-20 rounded-2xl border border-white/15 bg-neutral-950/70 p-6 sm:p-10" aria-labelledby="more">
        <h2 id="more" className={h2}>{t("moreTitle")}</h2>
        <p className="mt-4 max-w-3xl text-lg text-neutral-200">{t("more")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="https://www.youtube.com/user/mafiaclK" target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-full border border-white/55 px-5 font-bold hover:bg-white/10">
            ▶ YouTube ↗
          </a>
          <a href="https://t.me/mafia_clp" target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-full border border-white/55 px-5 font-bold hover:bg-white/10">
            Telegram @mafia_clp ↗
          </a>
          <Link href="/play" className="inline-flex min-h-11 items-center rounded-full bg-red-600 px-5 font-bold text-white hover:bg-red-500">
            {t("ctaPlay")}
          </Link>
        </div>
      </section>
    </main>
  );
}
