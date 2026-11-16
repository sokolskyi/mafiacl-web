import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { LEGAL_HREF, legalText } from "@/content/legal";
import { fillOperator, OPERATOR } from "@/content/legal/operator";
import type { LegalDocKey } from "@/content/legal/types";

const ORDER: LegalDocKey[] = ["terms", "privacy", "shop"];

/** Юридический документ: оглавление, разделы с пунктами 1.1, 1.2 …, ссылки на соседние документы. */
export async function LegalDoc({ locale, doc }: { locale: Locale; doc: LegalDocKey }) {
  const t = await getTranslations({ locale, namespace: "legal" });
  const p = await getTranslations({ locale, namespace: "pages" });
  const text = legalText(doc, locale);
  const others = ORDER.filter((d) => d !== doc);

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-sm print:hidden">
        <Link href="/documents" className="text-neutral-400 hover:text-white">← {p("documents.title")}</Link>
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{text.title}</h1>
      <p className="mt-4 max-w-3xl text-lg text-neutral-300">{text.lead}</p>
      <p className="mt-3 text-sm text-neutral-400">
        {t("effective", { date: OPERATOR.effective })}
        {locale !== "cs" && <> · {t("czechPrevails")}</>}
      </p>

      <nav aria-labelledby="toc" className="mt-10 max-w-3xl print:hidden">
        <h2 id="toc" className="text-sm font-semibold uppercase tracking-wide text-neutral-400">{t("toc")}</h2>
        <ol className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {text.sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="inline-flex min-h-8 items-center text-neutral-200 hover:text-white hover:underline">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {text.sections.map((s, i) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="mt-12 max-w-3xl scroll-mt-24">
          <h2 id={`${s.id}-title`} className="text-2xl font-bold">
            <span className="text-red-400">{i + 1}.</span> {s.title}
          </h2>
          <ol className="mt-4 space-y-3 text-neutral-200">
            {s.items.map((it, j) => (
              <li key={j} className="flex gap-3">
                <span className="w-9 flex-none tabular-nums text-neutral-400">{i + 1}.{j + 1}</span>
                <span>{fillOperator(it)}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section aria-labelledby="related" className="mt-14 max-w-3xl border-t border-white/10 pt-8 print:hidden">
        <h2 id="related" className="text-xl font-bold">{t("related")}</h2>
        <ul className="mt-3 space-y-1">
          {others.map((d) => (
            <li key={d}>
              <Link href={LEGAL_HREF[d]} className="inline-flex min-h-8 items-center underline underline-offset-4 hover:text-white">
                {legalText(d, locale).title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
