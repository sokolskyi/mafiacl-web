import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { HOST_LANGS, type Host } from "@/lib/hosts";
import { loc } from "@/lib/shop/queries";

/** Карточки ведущих: ник, имя, стаж, языки (на которых ведёт — подсвечены). */
export async function HostCards({ hosts, locale }: { hosts: Host[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "hosts" });
  if (hosts.length === 0) return <p className="mt-6 text-neutral-400">{t("empty")}</p>;
  return (
    <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {hosts.map((h) => (
        <li key={h.id} className="flex gap-4 rounded-lg border border-white/15 bg-neutral-950/60 p-5">
          {h.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={h.photoUrl} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" loading="lazy" />
          ) : (
            <span aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-red-700 font-display text-3xl font-extrabold uppercase">
              {h.nickname.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-display text-3xl font-extrabold leading-none">
              {h.profileNick ? (
                <Link href={{ pathname: "/players/[nick]", params: { nick: h.profileNick } }} className="hover:underline">
                  {h.nickname}
                </Link>
              ) : (
                h.nickname
              )}
            </p>
            <p className="mt-1 text-neutral-300">{h.name}</p>
            {(h.playingSince || h.hostingSince) && (
              <p className="mt-1 text-sm text-neutral-400">
                {[h.playingSince && t("playingSince", { year: h.playingSince }), h.hostingSince && t("hostingSince", { year: h.hostingSince })]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <p className="sr-only">{t("languages")}: {h.languages.map((l) => t(`lang.${l}`)).join(", ")}</p>
            <ul aria-hidden="true" className="mt-3 flex flex-wrap gap-1.5">
              {HOST_LANGS.map((l) => {
                const on = h.languages.includes(l);
                return (
                  <li
                    key={l}
                    title={t(`lang.${l}`)}
                    className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${on ? "bg-white text-black" : "border border-white/15 text-neutral-600 line-through"}`}
                  >
                    {t(`code.${l}`)}
                  </li>
                );
              })}
            </ul>
            {h.bio && <p className="mt-3 text-sm text-neutral-300">{loc(h.bio, locale)}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
