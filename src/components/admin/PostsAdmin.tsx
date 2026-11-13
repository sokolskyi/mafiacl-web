import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { decidePost } from "@/lib/blog-actions";
import { paragraphs } from "@/lib/blog-posts";

/** Статьи игроков на модерации. Одобрение публикует статью; за первую в году автор получает +15 Respect. */
export async function PostsAdmin({ locale, clubIds }: { locale: Locale; clubIds: number[] }) {
  const { data } = await createAdminClient()
    .from("blog_posts")
    .select("id, lang, title, body, images, created_at, profiles!blog_posts_author_id_fkey ( nickname )")
    .in("club_id", clubIds)
    .eq("status", "pending")
    .order("created_at")
    .limit(30);
  if (!data?.length) return null;
  const t = await getTranslations({ locale, namespace: "blogPosts" });
  const input = "rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500";
  return (
    <section id="posts" aria-labelledby="posts-title">
      <h2 id="posts-title" className="text-xl font-bold">{t("adminTitle", { n: data.length })}</h2>
      <p className="mt-1 text-sm text-neutral-400">{t("adminHint")}</p>
      <ul className="mt-4 space-y-3">
        {data.map((p) => (
          <li key={p.id} className="rounded border border-white/10">
            <details>
              <summary className="cursor-pointer px-4 py-3">
                <span className="font-semibold">{p.title}</span>
                <span className="ml-2 text-sm text-neutral-400">
                  {(p.profiles as unknown as { nickname: string | null } | null)?.nickname ?? "—"} · {p.lang.toUpperCase()} · {p.body.length}
                </span>
              </summary>
              {(p.images ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
                  {(p.images as string[]).map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt="" className="h-24 w-36 rounded object-cover" />
                  ))}
                </div>
              )}
              <div className="space-y-3 border-t border-white/10 px-4 py-3 text-neutral-200">
                {paragraphs(p.body).map((x, i) => <p key={i} className="whitespace-pre-line">{x}</p>)}
              </div>
              <form action={decidePost} className="flex flex-wrap items-end gap-2 border-t border-white/10 px-4 py-3">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="postId" value={p.id} />
                <label className="grid flex-1 gap-1 text-sm">
                  {t("note")}
                  <input name="note" maxLength={300} className={input} />
                </label>
                <button name="decision" value="approve" className="min-h-11 rounded bg-green-700 px-4 font-semibold hover:bg-green-600">{t("approve")}</button>
                <button name="decision" value="reject" className="min-h-11 rounded bg-white/10 px-4 hover:bg-white/20">{t("reject")}</button>
              </form>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
