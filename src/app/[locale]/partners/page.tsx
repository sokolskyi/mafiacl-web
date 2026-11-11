import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getPartners } from "@/lib/partners";
import { loc } from "@/lib/shop/queries";
import { SectionPage } from "@/components/SectionPage";

export async function generateMetadata({ params }: PageProps<"/[locale]/partners">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "partners", href: "/partners" });
}

export default async function Page({ params }: PageProps<"/[locale]/partners">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "partners" });
  const partners = await getPartners(MAIN_CLUB_SLUG);

  return (
    <SectionPage locale={locale} pageKey="partners">
      {partners.length === 0 ? (
        <p className="mt-10 text-neutral-400">{t("empty")}</p>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => (
            <li key={p.id} className="relative flex flex-col overflow-hidden rounded-lg border border-white/15 bg-neutral-950/60 focus-within:outline focus-within:outline-2 focus-within:outline-white">
              <div className="flex h-40 items-center justify-center bg-[#fdffc2] p-6">
                {p.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logoUrl} alt={p.name} className="max-h-full max-w-full object-contain" loading="lazy" />
                ) : (
                  <span className="font-display text-4xl font-extrabold uppercase text-black">{p.name}</span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-lg font-bold">
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener" className="after:absolute after:inset-0 hover:underline">
                      {p.name}
                    </a>
                  ) : (
                    p.name
                  )}
                </h2>
                {p.description && <p className="mt-2 text-sm text-neutral-300">{loc(p.description, locale)}</p>}
                {p.url && <p className="mt-auto pt-4 text-sm font-semibold text-red-300">{new URL(p.url).hostname.replace(/^www\./, "")} ↗</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionPage>
  );
}
