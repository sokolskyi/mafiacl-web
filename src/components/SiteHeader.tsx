import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { NAV_GROUPS } from "@/lib/site";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileMenu } from "./MobileMenu";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const c = await getTranslations({ locale, namespace: "common" });

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1360px] items-center gap-3 px-4 py-2.5 sm:gap-6 lg:px-6">
        <Link href="/" className="flex-none" aria-label="MafiaCL">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mafiacl-wordmark-dark.svg" alt="MafiaCL" width={112} height={40} className="h-8 w-auto lg:h-9" />
        </Link>

        {/* Широкий экран: 5 групп, подменю по наведению и с клавиатуры. */}
        <nav aria-label={c("menu")} className="hidden flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-1">
            {NAV_GROUPS.map((grp) => (
              <li key={grp.key} className="group relative">
                <Link
                  href={grp.items[0].href}
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-semibold text-neutral-200 hover:bg-white/10 hover:text-white"
                >
                  {t(grp.key)}
                </Link>
                {grp.items.length > 1 && (
                  <ul className="invisible absolute left-0 top-full z-50 grid min-w-56 translate-y-1 gap-0.5 rounded-2xl border border-white/10 bg-neutral-900 p-2 opacity-0 shadow-2xl transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    {grp.items.map((it) => (
                      <li key={it.href}>
                        <Link href={it.href} className="flex min-h-11 items-center rounded-xl px-3 font-semibold hover:bg-white/10">
                          {t(it.label)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <Suspense fallback={<span className="block w-[148px]" aria-hidden="true" />}>
              <LocaleSwitcher label={c("language")} />
            </Suspense>
          </div>
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-black hover:bg-neutral-200"
          >
            {t("account")}
          </Link>

          {/* Телефон и планшет: всё меню по группам. */}
          <MobileMenu className="relative lg:hidden">
            <summary
              aria-label={c("menu")}
              className="inline-flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-white/50 marker:hidden [&::-webkit-details-marker]:hidden"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </summary>
            <nav
              aria-label={c("menu")}
              className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100svh-90px)] w-[min(88vw,360px)] overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900 p-3 shadow-2xl"
            >
              {NAV_GROUPS.map((grp) => (
                <div key={grp.key} className="border-b border-white/10 py-2 last:border-0">
                  {grp.items.length > 1 && (
                    <p className="px-3 pb-1 pt-1 text-xs font-bold uppercase tracking-[0.14em] text-red-300">{t(grp.key)}</p>
                  )}
                  <ul className="grid grid-cols-2 gap-0.5">
                    {grp.items.map((it) => (
                      <li key={it.href}>
                        <Link href={it.href} className="flex min-h-11 items-center rounded-xl px-3 font-semibold hover:bg-white/10">
                          {t(it.label)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="px-3 pt-3 sm:hidden">
                <Suspense fallback={<span className="block w-[148px]" aria-hidden="true" />}>
                  <LocaleSwitcher label={c("language")} />
                </Suspense>
              </div>
            </nav>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
