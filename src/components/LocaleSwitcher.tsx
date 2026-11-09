"use client";

import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABEL = { cs: "CS", ru: "RU", uk: "UA", en: "EN" } as const;

export function LocaleSwitcher({ label }: { label: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();

  return (
    <nav aria-label={label} className="flex gap-1 text-xs font-semibold">
      {routing.locales.map((l) => (
        <Link
          key={l}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          href={{ pathname, params } as any}
          locale={l}
          hrefLang={l}
          aria-current={l === locale ? "true" : undefined}
          className={
            "rounded px-2 py-1 transition-colors " +
            (l === locale
              ? "bg-white text-black"
              : "text-neutral-400 hover:text-white")
          }
        >
          {LABEL[l]}
        </Link>
      ))}
    </nav>
  );
}
