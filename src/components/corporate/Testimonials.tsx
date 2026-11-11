import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { Testimonial } from "@/lib/testimonials";

/** Отзывы: фото и имя, повод и компания (если есть), сам отзыв. */
export async function Testimonials({ items, locale }: { items: Testimonial[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "corporate" });
  const month = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <ul className="mt-8 grid gap-5 md:grid-cols-2">
      {items.map((r) => {
        const meta = [r.eventType ? t(`formats.${r.eventType}.title`) : null, r.company, r.eventDate ? month.format(new Date(r.eventDate)) : null].filter(Boolean);
        return (
          <li key={r.id}>
            <figure className="flex h-full flex-col rounded-lg border border-white/15 bg-neutral-950/60 p-6">
              <blockquote className="flex-1 whitespace-pre-line text-lg leading-relaxed text-neutral-100">
                <span aria-hidden="true" className="mr-1 font-display text-4xl leading-none text-red-400">“</span>
                {r.body}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-4">
                {r.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" loading="lazy" />
                ) : (
                  <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-700 font-display text-2xl font-extrabold uppercase">
                    {r.author.slice(0, 1)}
                  </span>
                )}
                <span>
                  <span className="block font-bold">{r.author}</span>
                  {meta.length > 0 && <span className="block text-sm text-neutral-400">{meta.join(" · ")}</span>}
                </span>
              </figcaption>
            </figure>
          </li>
        );
      })}
    </ul>
  );
}
