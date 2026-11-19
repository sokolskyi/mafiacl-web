import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getRelated, type ArticleRef } from "@/lib/blog-social";
import { monthTitle } from "@/components/reviews/format";
import { PostSocial } from "./PostSocial";

/** Под статьёй: реакции и комментарии, затем «Популярное», «Предыдущая статья» и другие статьи автора. */
export async function PostExtras({ slug, title, locale }: { slug: string; title: string; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "blogSocial" });
  const tr = await getTranslations({ locale, namespace: "reviews" });
  const { current, popular, previous, byAuthor } = await getRelated(slug);
  const name = (a: ArticleRef) => (a.kind === "review" && a.month ? tr("title", { month: monthTitle(a.month, locale) }) : a.title);
  const href = (a: ArticleRef) => ({ pathname: "/blog/[slug]" as const, params: { slug: a.slug } });

  return (
    <>
      <PostSocial slug={slug} title={title} />

      {(popular || previous) && (
        <nav aria-label={t("moreLabel")} className="mt-10 flex flex-wrap gap-3">
          {popular && (
            <Link href={href(popular)} className="inline-flex max-w-full items-center gap-2 rounded-xl bg-[#fdffc2] px-5 py-3 font-bold text-neutral-950 hover:bg-white">
              <span className="shrink-0">{t("popular")}:</span>
              <span className="truncate">{name(popular)}</span>
              <span aria-hidden="true">›</span>
            </Link>
          )}
          {previous && (
            <Link href={href(previous)} className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/30 px-5 py-3 font-bold hover:border-white">
              <span aria-hidden="true">‹</span>
              <span className="shrink-0">{t("previous")}:</span>
              <span className="truncate">{name(previous)}</span>
            </Link>
          )}
        </nav>
      )}

      {byAuthor.length > 0 && (
        <section aria-labelledby="by-author" className="mt-10">
          <h2 id="by-author" className="text-xl font-bold">
            {current?.author ? t("byAuthor", { author: current.author }) : t("moreReviews")}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {byAuthor.map((a) => (
              <li key={a.slug}>
                <Link href={href(a)} className="block h-full rounded-lg border border-white/15 bg-neutral-950/60 p-4 hover:border-red-500/70">
                  <p className="font-semibold">{name(a)}</p>
                  <p className="mt-1 text-sm text-neutral-400">
                    {new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague" }).format(new Date(a.date))}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
