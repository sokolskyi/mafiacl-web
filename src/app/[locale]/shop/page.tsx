import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { getProducts } from "@/lib/shop/queries";
import { SectionPage } from "@/components/SectionPage";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "shop", href: "/shop" });
}

export default async function Page({ params }: PageProps<"/[locale]/shop">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "shop" });
  const products = await getProducts(MAIN_CLUB_SLUG);
  return (
    <SectionPage locale={locale} pageKey="shop">
      <p className="mt-6">
        <Link href="/shop/cart" className="inline-flex min-h-11 items-center rounded-full border border-white/55 px-5 font-semibold hover:bg-white/10">
          {t("cart")}
        </Link>
      </p>
      <ShopGrid products={products} locale={locale} />
    </SectionPage>
  );
}
