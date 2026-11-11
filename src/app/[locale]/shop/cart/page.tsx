import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { CartView } from "@/components/shop/CartView";

export const metadata: Metadata = { title: "Cart", robots: { index: false, follow: false } };

type Props = PageProps<"/[locale]/shop/cart">;

export default async function Page({ params, searchParams }: Props) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "shop" });
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl sm:text-5xl">{t("cart")}</h1>
      <Suspense fallback={<p className="mt-10 text-neutral-500">…</p>}>
        <Inner searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Вошёл ли посетитель, знаем только во время запроса — внутри <Suspense>.
async function Inner({ searchParams }: Pick<Props, "searchParams">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sp = await searchParams;
  return <CartView signedIn={Boolean(data?.claims.sub)} error={typeof sp.error === "string" ? sp.error : undefined} />;
}
