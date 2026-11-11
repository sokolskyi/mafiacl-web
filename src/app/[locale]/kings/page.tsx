import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { getKingsSeasonPath } from "@/lib/kings";

export async function generateMetadata({ params }: PageProps<"/[locale]/kings">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "kings", href: "/kings" });
}

// Раздел MafiaCL Kings — готовая страница сезона (дизайн и данные старого сайта, /seasons/<id>).
export default async function Page() {
  redirect(await getKingsSeasonPath());
}
