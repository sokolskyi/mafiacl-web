import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type Section = { id: string; title: string; items: string[] };

/** Краткое изложение правил игры по разделам со ссылкой на официальный текст. */
export async function RulesDoc({
  locale,
  namespace,
  source,
  more,
}: {
  locale: Locale;
  namespace: "rules" | "rulesEmotion";
  source: string;
  more: readonly { key: string; href: string }[];
}) {
  const t = await getTranslations({ locale, namespace });
  const d = await getTranslations({ locale, namespace: "pages" });
  const sections = t.raw("sections") as Section[];
  const tt = t as unknown as (key: string) => string;
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-sm">
        <Link href="/documents" className="text-neutral-400 hover:text-white">← {d("documents.title")}</Link>
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{t("title")}</h1>
      <p className="mt-4 max-w-3xl text-lg text-neutral-300">{t("lead")}</p>

      <aside className="mt-6 max-w-3xl rounded-lg border border-white/15 bg-neutral-950/60 p-4 text-sm text-neutral-300">
        <p className="font-semibold text-white">{t("edition")}</p>
        <p className="mt-1">{t("sourceNote")}</p>
        <p className="mt-2">
          <a href={source} target="_blank" rel="noopener" className="font-semibold text-white underline underline-offset-4 hover:text-red-300">
            {t("sourceLink")} ↗
          </a>
        </p>
      </aside>

      <nav aria-labelledby="toc" className="mt-10 max-w-3xl">
        <h2 id="toc" className="text-sm font-semibold uppercase tracking-wide text-neutral-400">{t("tocTitle")}</h2>
        <ol className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="inline-flex min-h-8 items-center text-neutral-200 hover:text-white hover:underline">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((s, i) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="mt-12 max-w-3xl scroll-mt-24">
          <h2 id={`${s.id}-title`} className="font-display text-3xl font-extrabold uppercase">
            <span className="text-red-400">{i + 1}.</span> {s.title}
          </h2>
          <ul className="mt-4 space-y-3 text-neutral-200">
            {s.items.map((it, j) => (
              <li key={j} className="flex gap-3">
                <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-red-400" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section aria-labelledby="more" className="mt-14 max-w-3xl border-t border-white/10 pt-8">
        <h2 id="more" className="text-xl font-bold">{t("moreTitle")}</h2>
        <ul className="mt-3 space-y-1">
          {more.map((m) => (
            <li key={m.key}>
              <a href={m.href} target="_blank" rel="noopener" className="inline-flex min-h-8 items-center underline underline-offset-4 hover:text-white">
                {tt(`more.${m.key}`)} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
