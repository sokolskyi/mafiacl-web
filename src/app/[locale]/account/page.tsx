import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { SectionPage } from "@/components/SectionPage";
import { AccountPanel } from "@/components/account/AccountPanel";

// Кабинет закрыт от поисковиков.
export async function generateMetadata({ params }: PageProps<"/[locale]/account">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "account", href: "/account", noindex: true });
}

export default async function Page({ params, searchParams }: PageProps<"/[locale]/account">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "account" });

  return (
    <SectionPage locale={locale} pageKey="account">
      <Suspense fallback={<p className="mt-10 text-neutral-500">{t("loading")}</p>}>
        <AuthError searchParams={searchParams}>
          {(authError, post, referral, podium) => <AccountPanel locale={locale} authError={authError} post={post} referral={referral} podium={podium} />}
        </AuthError>
      </Suspense>
    </SectionPage>
  );
}

/** searchParams — данные запроса, поэтому читаем их внутри Suspense. */
async function AuthError({
  searchParams,
  children,
}: {
  searchParams: PageProps<"/[locale]/account">["searchParams"];
  children: (authError: boolean, post?: string, referral?: string, podium?: string) => React.ReactNode;
}) {
  const sp = await searchParams;
  return children(sp.auth === "error", typeof sp.post === "string" ? sp.post : undefined, typeof sp.referral === "string" ? sp.referral : undefined, typeof sp.podium === "string" ? sp.podium : undefined);
}
