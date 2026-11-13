import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getReviews } from "@/lib/reviews/queries";
import { reviewSlug } from "@/lib/reviews/types";
import { monthTitle } from "@/components/reviews/format";
import { MASTERCLASSES, MASTERCLASS_PLAYLIST } from "@/lib/masterclasses";
import { getApprovedPosts, paragraphs, postSlug } from "@/lib/blog-posts";

export async function generateMetadata({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "blog", href: "/blog" });
}

export default async function Page({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const tp = await getTranslations({ locale, namespace: "pages" });
  const t = await getTranslations({ locale, namespace: "reviews" });
  const reviews = await getReviews(MAIN_CLUB_SLUG);
  const tb = await getTranslations({ locale, namespace: "blog" });
  const tpost = await getTranslations({ locale, namespace: "blogPosts" });
  const posts = await getApprovedPosts();
  const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague" });
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{tp("blog.title")}</h1>
      <p className="mt-4 max-w-2xl text-lg text-neutral-300">{tp("blog.description")}</p>

      <section aria-labelledby="reviews" className="mt-12">
        <h2 id="reviews" className="font-display text-3xl font-extrabold uppercase">{t("listTitle")}</h2>
        <p className="mt-2 max-w-3xl text-neutral-300">{t("listLead")}</p>
        {reviews.length === 0 ? (
          <p className="mt-6 text-neutral-400">{t("listEmpty")}</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => {
              const leaders = (["premier", "arena", "mafiacl"] as const)
                .map((k) => (r.rankings[k]?.[0] ? `${t(`rankings.${k}.short`)}: ${r.rankings[k]![0].n}` : null))
                .filter(Boolean);
              return (
                <li key={r.month}>
                  <Link
                    href={{ pathname: "/blog/[slug]", params: { slug: reviewSlug(r.month) } }}
                    className="block h-full rounded-lg border border-white/15 bg-neutral-950/60 p-6 hover:border-red-500/70"
                  >
                    <p className="text-sm uppercase tracking-widest text-neutral-400">{t("kicker")}</p>
                    <p className="mt-1 font-display text-3xl font-extrabold uppercase">{monthTitle(r.month, locale)}</p>
                    {r.partial && <p className="mt-1 text-sm text-amber-300">{t("partialShort")}</p>}
                    <p className="mt-3 text-neutral-300">{leaders.join(" · ")}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {posts.length > 0 && (
        <section aria-labelledby="posts" className="mt-16">
          <h2 id="posts" className="font-display text-3xl font-extrabold uppercase">{tpost("listTitle")}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={{ pathname: "/blog/[slug]", params: { slug: postSlug(p.id) } }}
                  className="block h-full overflow-hidden rounded-lg border border-white/15 bg-neutral-950/60 hover:border-red-500/70"
                >
                  {p.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                  )}
                  <div className="p-6">
                  <p className="text-sm text-neutral-400">{p.author ?? "—"} · {dateFmt.format(new Date(p.approvedAt))}{p.lang !== locale && ` · ${p.lang.toUpperCase()}`}</p>
                  <p className="mt-1 text-xl font-bold">{p.title}</p>
                  <p className="mt-2 line-clamp-3 text-neutral-300">{paragraphs(p.body)[0]}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-neutral-400">
            {tpost("listInvite")} <Link href="/account" className="underline hover:text-white">{tpost("listInviteLink")}</Link>
          </p>
        </section>
      )}

      <section aria-labelledby="masterclasses" className="mt-16">
        <h2 id="masterclasses" className="font-display text-3xl font-extrabold uppercase">{tb("masterclassesTitle")}</h2>
        <p className="mt-2 max-w-3xl text-neutral-300">{tb("masterclassesLead")}</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MASTERCLASSES.map((m) => (
            <li key={m.id}>
              <a
                href={`https://www.youtube.com/watch?v=${m.id}&list=${MASTERCLASS_PLAYLIST.split("list=")[1]}`}
                target="_blank"
                rel="noopener"
                className="group block h-full overflow-hidden rounded-lg border border-white/15 bg-neutral-950/60 hover:border-red-500/70"
              >
                <div className="relative aspect-video bg-neutral-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${m.id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 group-hover:opacity-100" />
                  <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-xs">{m.length}</span>
                </div>
                <div className="p-4">
                  <p className="text-sm text-neutral-400">
                    {m.author}
                    {m.lang === "en" && <span className="ml-2 rounded bg-white/10 px-1.5 text-xs font-semibold">EN</span>}
                  </p>
                  <p className="mt-1 font-semibold leading-snug">{m.title}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <a href={MASTERCLASS_PLAYLIST} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center rounded-full border border-white/55 px-6 font-bold hover:bg-white/10">
            {tb("masterclassesAll")} ↗
          </a>
        </p>
      </section>
    </main>
  );
}
