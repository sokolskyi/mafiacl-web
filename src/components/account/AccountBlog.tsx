import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { submitPost } from "@/lib/blog-actions";
import { POST_LANGS, POST_LIMITS, postSlug } from "@/lib/blog-posts";

/** Кабинет: статья в блог клуба — форма и мои статьи со статусом. */
export async function AccountBlog({ locale, notice }: { locale: Locale; notice?: string }) {
  const t = await getTranslations({ locale, namespace: "blogPosts" });
  const supabase = await createClient();
  // RLS: свои статьи (любой статус).
  const { data: mine } = await supabase
    .from("blog_posts")
    .select("id, title, status, review_note, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  const own = (mine ?? []).filter(Boolean);
  const input = "mt-1 w-full rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500";
  const okNotice = notice === "sent";
  const errNotice = notice && !okNotice && ["invalid", "unverified", "tooMany", "error"].includes(notice) ? notice : null;
  return (
    <section id="blog" aria-labelledby="blog-title" className="mt-10 max-w-2xl">
      <h2 id="blog-title" className="text-sm font-semibold">{t("title")}</h2>
      <p className="mt-1 text-sm text-neutral-400">{t("hint")}</p>
      {okNotice && <p role="status" className="mt-3 text-sm text-green-400">{t("sent")}</p>}
      {errNotice && <p role="alert" className="mt-3 text-sm text-red-400">{t(`errors.${errNotice as "invalid" | "unverified" | "tooMany" | "error"}`)}</p>}
      {own.length > 0 && (
        <ul className="mt-3 divide-y divide-white/10 rounded border border-white/10 text-sm">
          {own.map((p) => (
            <li key={p.id} className="flex flex-wrap items-baseline gap-3 px-4 py-2">
              <span className="flex-1">
                {p.status === "approved" ? (
                  <Link href={{ pathname: "/blog/[slug]", params: { slug: postSlug(p.id) } }} className="font-semibold hover:underline">{p.title}</Link>
                ) : (
                  <span className="font-semibold">{p.title}</span>
                )}
                {p.review_note && <span className="block text-neutral-400">{p.review_note}</span>}
              </span>
              <span className={p.status === "approved" ? "text-green-400" : p.status === "rejected" ? "text-red-300" : "text-amber-300"}>
                {t(`status.${p.status as "pending" | "approved" | "rejected"}`)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <details className="mt-3 rounded border border-white/10">
        <summary className="cursor-pointer px-4 py-3 font-semibold">{t("write")}</summary>
        <form action={submitPost} className="space-y-3 border-t border-white/10 p-4">
          <input type="hidden" name="locale" value={locale} />
          <label className="block text-sm">
            {t("fieldTitle")}
            <input name="title" required minLength={POST_LIMITS.title[0]} maxLength={POST_LIMITS.title[1]} className={input} />
          </label>
          <label className="block text-sm">
            {t("fieldLang")}
            <select name="lang" defaultValue={locale} className={input}>
              {POST_LANGS.map((l) => <option key={l} value={l}>{t(`lang.${l}`)}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            {t("fieldBody")}
            <textarea name="body" required rows={12} minLength={POST_LIMITS.body[0]} maxLength={POST_LIMITS.body[1]} className={input} />
          </label>
          <p className="text-xs text-neutral-400">{t("bodyHint", { min: POST_LIMITS.body[0] })}</p>
          <button type="submit" className="min-h-11 rounded bg-red-600 px-5 font-semibold hover:bg-red-500">{t("submit")}</button>
        </form>
      </details>
    </section>
  );
}
