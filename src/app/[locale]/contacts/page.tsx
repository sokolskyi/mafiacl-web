import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getVenues } from "@/lib/venues";
import { loc } from "@/lib/shop/queries";
import { AboutHeader, AboutNav } from "@/components/about/AboutNav";

/** Публичные контакты клуба (те же, что на страницах MCL и в анонсах). */
const CONTACTS = [
  { key: "telegram", label: "@Yes1911", href: "https://t.me/Yes1911" },
  { key: "phone", label: "+420 773 194 945", href: "tel:+420773194945" },
  { key: "instagram", label: "@mafia_clp_e", href: "https://www.instagram.com/mafia_clp_e/" },
  { key: "youtube", label: "@YeSMafiaShow", href: "https://www.youtube.com/@YeSMafiaShow" },
] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/contacts">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "contacts", href: "/contacts" });
}

export default async function Page({ params }: PageProps<"/[locale]/contacts">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about.contacts" });
  const venues = await getVenues(MAIN_CLUB_SLUG);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
  // 2024-01-01 — понедельник: weekday 1..7 (ISO) → дата этой недели.
  const dayName = (d: number) => weekday.format(new Date(Date.UTC(2024, 0, d)));
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <AboutNav locale={locale} current="contacts" />
      <AboutHeader title={t("title")} lead={t("lead")} />

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CONTACTS.map((c) => (
          <li key={c.key} className="rounded-lg border border-white/15 bg-neutral-950/60 p-5">
            <p className="text-sm uppercase tracking-widest text-neutral-400">{t(`kinds.${c.key}`)}</p>
            <a href={c.href} className="mt-2 block break-words text-xl font-bold hover:underline" {...(c.href.startsWith("https") ? { target: "_blank", rel: "noopener" } : {})}>
              {c.label}
            </a>
            <p className="mt-1 text-sm text-neutral-400">{t(`hints.${c.key}`)}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="venues" className="mt-14">
        <h2 id="venues" className="font-display text-3xl font-extrabold uppercase">{t("venuesTitle")}</h2>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2">
          {venues.map((v) => (
            <li key={v.id} className="rounded-lg border border-white/15 bg-neutral-950/60 p-6">
              <p className="font-display text-2xl font-extrabold uppercase">{v.name}</p>
              {v.address && <p className="mt-2 text-neutral-300">{v.address}</p>}
              {v.slots.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {v.slots.map((s, i) => (
                    <li key={i} className="text-neutral-200">
                      <span className="font-semibold capitalize">{dayName(s.weekday)}</span>, {s.time} — {loc(s.title, locale).replace(/\s*\{n\}/, "")}
                    </li>
                  ))}
                </ul>
              )}
              {v.mapsUrl && (
                <a href={v.mapsUrl} target="_blank" rel="noopener" className="mt-4 inline-flex min-h-11 items-center text-red-300 underline underline-offset-4 hover:text-white">
                  {t("map")}
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-12 text-lg text-neutral-300">
        {t("corporate")}{" "}
        <Link href="/corporate" className="underline underline-offset-4 hover:text-white">{t("corporateLink")}</Link>
      </p>
    </main>
  );
}
