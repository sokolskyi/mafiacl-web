import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getTestimonials } from "@/lib/testimonials";
import { getHosts } from "@/lib/hosts";
import { SectionPage } from "@/components/SectionPage";
import { Testimonials } from "@/components/corporate/Testimonials";
import { ReviewForm } from "@/components/reviews/ReviewForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/reviews">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "reviews", href: "/reviews" });
}

export default async function Page({ params }: PageProps<"/[locale]/reviews">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "testimonials" });
  const [items, hosts] = await Promise.all([getTestimonials(MAIN_CLUB_SLUG, "all"), getHosts(MAIN_CLUB_SLUG)]);
  const h2 = "font-display text-3xl font-extrabold uppercase";
  return (
    <SectionPage locale={locale} pageKey="reviews">
      {items.length > 0 ? (
        <>
          <p className="mt-6">
            <a href="#leave-review" className="font-semibold text-red-300 hover:underline">{t("leaveLink")} ↓</a>
          </p>
          <Testimonials items={items} locale={locale} />
        </>
      ) : (
        <p className="mt-10 text-neutral-400">{t("empty")}</p>
      )}
      <section id="leave-review" className="mt-16 max-w-3xl scroll-mt-24" aria-labelledby="leave-review-title">
        <h2 id="leave-review-title" className={h2}>{t("formTitle")}</h2>
        <p className="mt-3 text-neutral-300">{t("formLead")}</p>
        <div className="mt-6">
          <ReviewForm locale={locale} hosts={hosts.filter((h) => h.teamRoles.includes("host") || h.teamRoles.includes("founder")).map((h) => ({ id: h.id, nickname: h.nickname }))} />
        </div>
      </section>
    </SectionPage>
  );
}
