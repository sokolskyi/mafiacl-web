import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { MAIN_NAV, SECTIONS } from "@/lib/site";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileMenu } from "./MobileMenu";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const c = await getTranslations({ locale, namespace: "common" });

  return (
    <header className="sticky top-0 z-40 border-b border-white/15 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6">
        <Link href="/" className="flex-none" aria-label="MafiaCL">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mafiacl-wordmark-dark.svg" alt="MafiaCL" width={112} height={40} className="h-10 w-auto" />
        </Link>
        <MobileMenu className="group relative xl:hidden">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-full border border-white/55 px-4 text-sm font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
            {c("menu")}
          </summary>
          <nav aria-label={c("menu")} className="absolute left-0 top-full z-50 mt-2 grid min-w-56 gap-0 rounded-lg border border-white/15 bg-neutral-950 p-2 shadow-xl">
            {MAIN_NAV.map((key) => (
              <Link key={key} href={SECTIONS[key]} className="inline-flex min-h-11 items-center rounded px-3 font-semibold hover:bg-white/10">
                {t(key)}
              </Link>
            ))}
            <div className="mt-1 border-t border-white/15 px-3 py-3 sm:hidden">
              <Suspense fallback={<span className="block w-[148px]" aria-hidden="true" />}>
                <LocaleSwitcher label={c("language")} />
              </Suspense>
            </div>
          </nav>
        </MobileMenu>
        <nav aria-label={c("menu")} className="hidden flex-1 gap-x-5 text-sm xl:flex">
          {MAIN_NAV.map((key) => (
            <Link key={key} href={SECTIONS[key]} className="inline-flex min-h-11 items-center font-semibold text-neutral-300 hover:text-white">
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {/* Переключатель читает адрес страницы — на динамических страницах он догружается. */}
          <div className="hidden sm:block">
            <Suspense fallback={<span className="block w-[148px]" aria-hidden="true" />}>
              <LocaleSwitcher label={c("language")} />
            </Suspense>
          </div>
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center rounded-full border border-white/55 px-5 text-sm font-semibold hover:bg-white/10"
          >
            {t("account")}
          </Link>
        </div>
      </div>
    </header>
  );
}
