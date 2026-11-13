import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getProduct, loc, money } from "@/lib/shop/queries";
import { PriceSchedule } from "@/components/shop/PriceSchedule";
import { ProductBuy } from "@/components/shop/ProductBuy";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop/[slug]">): Promise<Metadata> {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const product = await getProduct(MAIN_CLUB_SLUG, slug);
  if (!product) return { title: "Shop" };
  const images = product.images.slice(0, 1);
  return { title: loc(product.name, locale), description: loc(product.description, locale) || undefined, openGraph: { images } };
}

type Props = PageProps<"/[locale]/shop/[slug]">;

// slug неизвестен при сборке — params читаем только внутри <Suspense>.
export default function Page({ params }: Props) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <Suspense fallback={<p className="text-neutral-500">…</p>}>
        <Inner params={params} />
      </Suspense>
    </main>
  );
}

async function Inner({ params }: Pick<Props, "params">) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "shop" });
  const product = await getProduct(MAIN_CLUB_SLUG, slug);
  if (!product) notFound();
  const name = loc(product.name, locale);

  // Ник для печати подставляем из профиля, если покупатель вошёл.
  let defaultNickname: string | undefined;
  if (product.askNickname) {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const uid = claims?.claims.sub;
    if (uid) {
      const { data: prof } = await supabase.from("profiles").select("nickname").eq("id", uid).maybeSingle();
      defaultNickname = prof?.nickname ?? undefined;
    }
  }

  return (
    <>
      <p>
        <Link href="/shop" className="inline-flex min-h-11 items-center text-sm text-neutral-300 hover:underline">
          ← {t("toShop")}
        </Link>
      </p>
      <ProductBuy
        header={
          <>
            <h1 className="text-5xl sm:text-6xl">{name}</h1>
            {product.onSale && <p className="mt-4 font-display text-5xl font-extrabold">{money(locale, product.priceCzk)}</p>}
            <PriceSchedule product={product} locale={locale} />
            {product.description && <p className="mt-5 max-w-prose text-lg text-neutral-300">{loc(product.description, locale)}</p>}
          </>
        }
        footer={product.kind === "membership" ? <p className="mt-6 text-sm text-neutral-400">{t("membershipNote")}</p> : undefined}
        photoLabel={t("photo")}
        productId={product.id}
        name={name}
        priceCzk={product.priceCzk}
        images={product.images}
        kind={product.kind}
        variants={product.variants}
        askNickname={product.askNickname}
        askColor={product.askColor}
        defaultNickname={defaultNickname}
        notOnSale={product.onSale ? undefined : <p className="text-lg font-semibold text-amber-300">{t("notOnSale")}</p>}
      />
    </>
  );
}
