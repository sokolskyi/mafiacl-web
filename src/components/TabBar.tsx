"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { href: "/play", label: "groupPlay", icon: "M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" },
  { href: "/tournaments", label: "tournaments", icon: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" },
  { href: "/ratings", label: "tabRating", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { href: "/account", label: "account", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" },
] as const;

/** Нижняя панель на телефоне: главное под большим пальцем. Адрес страницы догружается — до тех пор без подсветки. */
export function TabBar() {
  return (
    <Suspense fallback={<Bar path={null} />}>
      <LiveBar />
    </Suspense>
  );
}

function LiveBar() {
  return <Bar path={usePathname()} />;
}

function Bar({ path }: { path: string | null }) {
  const t = useTranslations("nav");
  return (
    <>
      <div aria-hidden="true" className="tabbar h-24 lg:hidden" />
      <nav
        aria-label={t("more")}
        className="tabbar fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 gap-1 rounded-full border border-white/15 bg-neutral-900/95 p-1.5 shadow-2xl backdrop-blur lg:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map((tab) => {
          const active = path !== null && (path === tab.href || path.startsWith(`${tab.href}/`));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-bold ${
                active ? "bg-red-600 text-white" : "text-neutral-200"
              }`}
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={tab.icon} />
              </svg>
              {t(tab.label)}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
