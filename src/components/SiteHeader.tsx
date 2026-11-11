import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { MAIN_NAV, SECTIONS } from "@/lib/site";
import { LocaleSwitcher } from "./LocaleSwitcher";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const c = await getTranslations({ locale, namespace: "common" });

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex-none" aria-label="MafiaCL">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mafiacl-wordmark-dark.svg" alt="MafiaCL" width={112} height={40} className="h-10 w-auto" />
        </Link>
        <nav aria-label={c("menu")} className="hidden flex-1 gap-4 text-sm lg:flex">
          {MAIN_NAV.map((key) => (
            <Link key={key} href={SECTIONS[key]} className="text-neutral-300 hover:text-white">
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {/* Переключатель читает адрес страницы — на динамических страницах он догружается. */}
          <Suspense fallback={<span className="w-[148px]" aria-hidden="true" />}>
            <LocaleSwitcher label={c("language")} />
          </Suspense>
          <Link
            href="/account"
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-semibold hover:bg-red-500"
          >
            {t("account")}
          </Link>
        </div>
      </div>
    </header>
  );
}
