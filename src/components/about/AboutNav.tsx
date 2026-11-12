import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const ABOUT_PAGES = [
  { key: "history", href: "/about/history" },
  { key: "code", href: "/about/code" },
  { key: "team", href: "/about/team" },
  { key: "hall", href: "/hall-of-fame" },
  { key: "promotions", href: "/about/promotions" },
  { key: "bans", href: "/about/bans" },
  { key: "contacts", href: "/contacts" },
] as const;

export type AboutKey = (typeof ABOUT_PAGES)[number]["key"];

/** Вкладки раздела «О клубе» — одинаковые на всех его страницах. */
export async function AboutNav({ locale, current }: { locale: Locale; current?: AboutKey }) {
  const t = await getTranslations({ locale, namespace: "about" });
  return (
    <nav aria-label={t("navLabel")} className="mb-10">
      <p>
        <Link href="/about" className="text-sm text-neutral-400 hover:text-white">
          {t("title")}
        </Link>
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {ABOUT_PAGES.map((p) => (
          <li key={p.key}>
            <Link
              href={p.href}
              aria-current={p.key === current ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
                p.key === current ? "border-red-500 bg-red-600 text-white" : "border-white/20 text-neutral-200 hover:border-white/50 hover:text-white"
              }`}
            >
              {t(`tabs.${p.key}`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Заголовок страницы раздела. */
export function AboutHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <header>
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
      {lead && <p className="mt-4 max-w-3xl text-lg text-neutral-300">{lead}</p>}
    </header>
  );
}
