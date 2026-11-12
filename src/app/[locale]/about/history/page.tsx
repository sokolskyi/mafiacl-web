import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { AboutHeader, AboutNav } from "@/components/about/AboutNav";

type Step = { year: string; place: string; title: string; text: string };

export async function generateMetadata({ params }: PageProps<"/[locale]/about/history">) {
  const { locale } = (await params) as { locale: Locale };
  return pageMetadata({ locale, key: "aboutHistory", href: "/about/history" });
}

export default async function Page({ params }: PageProps<"/[locale]/about/history">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about.history" });
  const steps = t.raw("steps") as Step[];
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <AboutNav locale={locale} current="history" />
      <AboutHeader title={t("title")} lead={t("lead")} />
      <ol className="mt-12 max-w-3xl space-y-10 border-l border-red-600/60 pl-6 sm:pl-10">
        {steps.map((s, i) => (
          <li key={i} className="relative">
            <span aria-hidden="true" className="absolute -left-[31px] top-2 h-3 w-3 rounded-full bg-red-500 ring-4 ring-red-500/20 sm:-left-[47px]" />
            <p className="font-display text-4xl font-extrabold leading-none text-red-400">{s.year}</p>
            <p className="mt-1 text-sm uppercase tracking-widest text-neutral-400">{s.place}</p>
            <h2 className="mt-3 text-2xl font-bold">{s.title}</h2>
            <p className="mt-2 text-lg text-neutral-300">{s.text}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
