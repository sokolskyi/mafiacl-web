import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { AdminGame } from "@/components/admin/AdminGame";

// Метаданные без params: у страницы динамический id, а админка всё равно закрыта от поиска.
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

type Props = PageProps<"/[locale]/admin/games/[id]">;

// id неизвестен при сборке — params читаем только внутри <Suspense>.
export default function Page({ params, searchParams }: Props) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <Suspense fallback={<p className="text-neutral-500">…</p>}>
        <Inner params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Inner({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { locale, id } = (await params) as { locale: Locale; id: string };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin" });
  const n = Number(id);
  if (!Number.isSafeInteger(n) || n < 1) notFound();
  const sp = await searchParams;
  const flag = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  return (
    <>
      <h1 className="text-4xl font-black tracking-tight">{t("title")}</h1>
      <AdminGame locale={locale} id={n} flags={{ saved: flag("saved"), created: flag("created"), error: flag("error") }} />
    </>
  );
}
