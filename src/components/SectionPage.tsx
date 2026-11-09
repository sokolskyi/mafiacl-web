import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

/** Временная заглушка раздела: заголовок, описание, «в разработке». */
export async function SectionPage({
  locale,
  pageKey,
  values,
  children,
}: {
  locale: Locale;
  pageKey: string;
  values?: Record<string, string>;
  children?: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "pages" });
  const c = await getTranslations({ locale, namespace: "common" });

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
        {t(`${pageKey}.title`, values)}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-neutral-300">
        {t(`${pageKey}.description`, values)}
      </p>
      {children ?? <p className="mt-10 text-neutral-500">{c("comingSoon")}</p>}
    </main>
  );
}
