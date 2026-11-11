import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { FOOTER_NAV, MAIN_NAV, SECTIONS } from "@/lib/site";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const c = await getTranslations({ locale, namespace: "common" });

  return (
    <footer className="mt-24 border-t border-white/10 text-sm text-neutral-400">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mafiacl-prague-dark.svg" alt="MafiaCL Prague, since 2011" width={176} height={95} className="h-24 w-auto" />
          <p className="mt-1">{c("tagline")}</p>
        </div>
        <ul className="space-y-1">
          {MAIN_NAV.map((key) => (
            <li key={key}>
              <Link href={SECTIONS[key]} className="hover:text-white">{t(key)}</Link>
            </li>
          ))}
        </ul>
        <ul className="space-y-1">
          {FOOTER_NAV.map((key) => (
            <li key={key}>
              <Link href={SECTIONS[key]} className="hover:text-white">{t(key)}</Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-xs">
        © 2011–<CurrentYear /> MafiaCL. {c("rights")}
      </p>
    </footer>
  );
}

/** Год кешируется вместе со сборкой (обновится при следующем деплое/ревалидации). */
async function CurrentYear() {
  "use cache";
  return <>{new Date().getFullYear()}</>;
}
