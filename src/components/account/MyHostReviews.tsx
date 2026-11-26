import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import type { HostReview } from "@/lib/hostReviews";
import { MarkReviewsSeen } from "./MarkReviewsSeen";

/** «Отзывы о вас» в кабинете ведущего: опубликованные отзывы, где посетитель выбрал его ведущим. Нет отзывов — блока нет. */
export async function MyHostReviews({ locale, data }: { locale: Locale; data: { host: string; reviews: HostReview[]; unseen: number } }) {
  if (!data.reviews.length) return null;
  const t = await getTranslations({ locale, namespace: "account" });
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague" });
  return (
    <section id="my-reviews" aria-labelledby="my-reviews-title" className="mt-8 max-w-xl scroll-mt-24">
      <h3 id="my-reviews-title" className="text-lg font-bold">{t("hostReviews", { host: data.host })}</h3>
      <ul className="mt-3 space-y-3">
        {data.reviews.map((r) => (
          <li key={r.id} className={`rounded border p-4 ${r.isNew ? "border-gold-400/50 bg-gold-500/10" : "border-white/10"}`}>
            <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
              <span className="font-semibold">{r.company ? `${r.author} · ${r.company}` : r.author}</span>
              <span className="text-neutral-400">{date.format(new Date(r.publishedAt))}</span>
              {r.isNew && <span className="rounded bg-gold-500/20 px-1.5 text-xs font-semibold text-gold-200">{t("hostReviewNew")}</span>}
            </p>
            <p className="mt-2 whitespace-pre-line text-neutral-100">{r.body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm">
        <Link href="/reviews" className="text-red-400 hover:text-red-300">{t("hostReviewsAll")}</Link>
      </p>
      {data.unseen > 0 && <MarkReviewsSeen />}
    </section>
  );
}
