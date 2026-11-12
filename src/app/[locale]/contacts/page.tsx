import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getVenues } from "@/lib/venues";
import { loc } from "@/lib/shop/queries";
import { CLUB_SOCIAL, KHARKIV_SOCIAL, SIGNUP_CONTACTS, type SocialLink } from "@/lib/social";
import { AboutHeader, AboutNav } from "@/components/about/AboutNav";

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
  // 1 января 2024 — понедельник: ISO-день недели 1..7 → день этой недели.
  const dayName = (d: number) => weekday.format(new Date(Date.UTC(2024, 0, d)));
  const h2 = "font-display text-3xl font-extrabold uppercase";

  const links = (list: SocialLink[]) => (
    <ul className="mt-3 space-y-2">
      {list.map((c) => (
        <li key={c.href}>
          <span className="text-sm text-neutral-400">{t(`kinds.${c.kind}`)}{c.note ? ` · ${t(`notes.${c.note}`)}` : ""}: </span>
          <a href={c.href} className="font-semibold hover:underline" {...(c.href.startsWith("https") ? { target: "_blank", rel: "noopener" } : {})}>
            {c.label}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <AboutNav locale={locale} current="contacts" />
      <AboutHeader title={t("title")} lead={t("lead")} />

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <section aria-labelledby="signup" className="rounded-lg border border-red-500/40 bg-neutral-950/60 p-6">
          <h2 id="signup" className={h2}>{t("signupTitle")}</h2>
          <p className="mt-2 text-neutral-300">{t("signupText")}</p>
          {links(SIGNUP_CONTACTS)}
        </section>
        <section aria-labelledby="social" className="rounded-lg border border-white/15 bg-neutral-950/60 p-6">
          <h2 id="social" className={h2}>{t("socialTitle")}</h2>
          <p className="mt-2 text-neutral-300">{t("socialText")}</p>
          {links(CLUB_SOCIAL)}
        </section>
      </div>

      <section aria-labelledby="venues" className="mt-14">
        <h2 id="venues" className={h2}>{t("venuesTitle")}</h2>
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

      <section aria-labelledby="kharkiv" className="mt-14 max-w-xl">
        <h2 id="kharkiv" className={h2}>{t("kharkivTitle")}</h2>
        <p className="mt-2 text-neutral-300">{t("kharkivText")}</p>
        {links(KHARKIV_SOCIAL)}
      </section>

      <p className="mt-12 text-lg text-neutral-300">
        {t("corporate")}{" "}
        <Link href="/corporate" className="underline underline-offset-4 hover:text-white">{t("corporateLink")}</Link>
      </p>
    </main>
  );
}
