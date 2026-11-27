import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { ACHIEVEMENT_GROUPS, type Achievement } from "@/lib/achievements";

/** Раздел «Достижения» в профиле: открытые — карточками, закрытые — под спойлером с прогрессом. */
export async function PlayerAchievements({ locale, items }: { locale: Locale; items: Achievement[] }) {
  const t = await getTranslations({ locale, namespace: "achievements" });
  const num = (n: number) => new Intl.NumberFormat(locale).format(n);
  const earned = items.filter((a) => a.earned);
  const locked = items.filter((a) => !a.earned);

  return (
    <section aria-labelledby="achievements" className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="achievements" className="text-xl font-bold">{t("title")}</h2>
        <p className="text-sm text-neutral-400">{t("summary", { earned: earned.length, total: items.length })}</p>
      </div>

      {earned.length === 0 ? (
        <p className="mt-3 text-neutral-400">{t("none")}</p>
      ) : (
        ACHIEVEMENT_GROUPS.map((g) => {
          const list = earned.filter((a) => a.group === g);
          if (!list.length) return null;
          return (
            <div key={g} className="mt-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">{t(`group.${g}`)}</h3>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 rounded-lg border border-gold-500/40 bg-gold-500/10 p-3">
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-xl text-gold-200">
                      {a.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {t(`items.${a.id}.name`)}
                        {a.repeatable && a.value > 1 && <span className="ml-1.5 text-sm font-bold text-gold-300">{t("times", { count: num(a.value) })}</span>}
                      </p>
                      <p className="text-sm text-neutral-300">{t(`items.${a.id}.desc`)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}

      {locked.length > 0 && (
        <details className="mt-5 rounded-lg border border-white/10 bg-neutral-950">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-neutral-300">{t("locked", { count: locked.length })}</summary>
          <ul className="grid gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
            {locked.map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-lg border border-white/10 p-3">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xl opacity-50 grayscale">
                  {a.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-300">{t(`items.${a.id}.name`)}</p>
                  <p className="text-sm text-neutral-400">{t(`items.${a.id}.desc`)}</p>
                  {a.goal > 1 && a.value > 0 && (
                    <div className="mt-2">
                      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800" aria-hidden="true">
                        <div className="h-full rounded-full bg-gold-400" style={{ width: `${Math.min(100, Math.round((a.value / a.goal) * 100))}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-neutral-400">{t("progress", { value: num(a.value), goal: num(a.goal) })}</p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
