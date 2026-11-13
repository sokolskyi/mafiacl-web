import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeAlias, saveAlias } from "@/lib/aliases-actions";

/** Старые и другие написания ников: архивы и зал славы засчитываются игроку под текущим ником. */
export async function AliasesAdmin({ locale, notice }: { locale: Locale; notice?: string }) {
  const t = await getTranslations({ locale, namespace: "admin.aliases" });
  const { data } = await createAdminClient().from("player_aliases").select("alias, canonical").order("canonical").limit(5000);
  const groups = new Map<string, string[]>();
  for (const r of data ?? []) groups.set(r.canonical, [...(groups.get(r.canonical) ?? []), r.alias]);
  const input = "rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500";
  return (
    <section id="aliases" aria-labelledby="aliases-title">
      <h2 id="aliases-title" className="text-xl font-bold">{t("title")}</h2>
      <p className="mt-1 max-w-3xl text-sm text-neutral-400">{t("hint")}</p>
      {notice && (
        <p role="status" className={`mt-3 text-sm ${notice === "invalid" ? "text-red-400" : "text-green-400"}`}>
          {t(notice === "invalid" ? "invalid" : notice === "removed" ? "removed" : "saved")}
        </p>
      )}
      <form action={saveAlias} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="locale" value={locale} />
        <label className="grid gap-1 text-sm">
          {t("alias")}
          <input name="alias" required maxLength={64} className={input} />
        </label>
        <label className="grid gap-1 text-sm">
          {t("canonical")}
          <input name="canonical" required maxLength={64} className={input} />
        </label>
        <button type="submit" className="min-h-11 rounded bg-red-600 px-4 font-semibold hover:bg-red-500">{t("add")}</button>
      </form>
      <details className="mt-4 rounded border border-white/10">
        <summary className="cursor-pointer px-4 py-3 font-semibold">{t("list", { n: data?.length ?? 0 })}</summary>
        <ul className="divide-y divide-white/10 border-t border-white/10 text-sm">
          {[...groups].map(([canonical, aliases]) => (
            <li key={canonical} className="flex flex-wrap items-center gap-2 px-4 py-2">
              <span className="font-semibold">{canonical}</span>
              <span aria-hidden="true" className="text-neutral-500">←</span>
              {aliases.map((a) => (
                <form key={a} action={removeAlias} className="inline-flex">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="alias" value={a} />
                  <button type="submit" className="rounded bg-white/10 px-2 py-0.5 hover:bg-red-600/40" aria-label={t("remove", { alias: a, canonical })}>
                    {a} ×
                  </button>
                </form>
              ))}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
