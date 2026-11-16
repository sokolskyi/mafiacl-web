import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { FOOTER_NAV, MAIN_NAV, SECTIONS } from "@/lib/site";
import { CLUB_SOCIAL } from "@/lib/social";
import { SocialIcon } from "@/components/SocialIcon";
import { LEGAL_HREF } from "@/content/legal";
import { OPERATOR } from "@/content/legal/operator";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const c = await getTranslations({ locale, namespace: "common" });
  const lg = await getTranslations({ locale, namespace: "legal" });

  return (
    <footer className="mt-24 border-t border-white/10 text-sm text-neutral-400">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mafiacl-prague-dark.svg" alt="MafiaCL Prague, since 2011" width={176} height={95} className="h-24 w-auto" />
          <p className="mt-1">{c("tagline")}</p>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
            {CLUB_SOCIAL.filter((l) => l.note !== "en").map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener" className="inline-flex min-h-8 items-center gap-1.5 hover:text-white">
                  <SocialIcon kind={l.kind} />
                  {l.kind === "youtube" ? "YouTube" : l.kind === "twitch" ? "Twitch" : l.kind === "telegram" ? "Telegram" : l.kind === "instagram" ? "Instagram" : "Facebook"}
                </a>
              </li>
            ))}
          </ul>
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
      <div className="mx-auto max-w-6xl space-y-2 px-4 pb-8 text-xs">
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {(["terms", "privacy", "shop"] as const).map((d) => (
            <li key={d}>
              <Link href={LEGAL_HREF[d]} className="inline-flex min-h-8 items-center hover:text-white">{lg(`links.${d}`)}</Link>
            </li>
          ))}
        </ul>
        <p>
          © 2011–<CurrentYear /> MafiaCL. {c("rights")} {lg("operator", { name: OPERATOR.name, ico: OPERATOR.ico, address: OPERATOR.address })}
        </p>
      </div>
    </footer>
  );
}

/** Год кешируется вместе со сборкой (обновится при следующем деплое/ревалидации). */
async function CurrentYear() {
  "use cache";
  return <>{new Date().getFullYear()}</>;
}
