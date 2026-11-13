import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const BLOG_POSTS_TAG = "blog-posts";
export const POST_LANGS = ["cs", "ru", "uk", "en"] as const;
export type PostLang = (typeof POST_LANGS)[number];
export const POST_LIMITS = { title: [5, 140], body: [300, 20000] } as const;

export type BlogPost = {
  id: number;
  lang: PostLang;
  title: string;
  body: string;
  approvedAt: string;
  author: string | null;
};

export const postSlug = (id: number) => `post-${id}`;
export const postIdOf = (slug: string) => {
  const m = /^post-(\d{1,12})$/.exec(slug);
  return m ? Number(m[1]) : null;
};

/** Одобренные статьи игроков (новые сверху). */
export async function getApprovedPosts(limit = 30): Promise<BlogPost[]> {
  "use cache";
  cacheTag(BLOG_POSTS_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient()
    .from("blog_posts")
    .select("id, lang, title, body, approved_at, profiles!blog_posts_author_id_fkey ( nickname )")
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(limit);
  if (error) console.error("getApprovedPosts failed", { code: error.code, message: error.message });
  return (data ?? []).map(toPost);
}

export async function getApprovedPost(id: number): Promise<BlogPost | null> {
  "use cache";
  cacheTag(BLOG_POSTS_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return null;
  const { data } = await createPublicClient()
    .from("blog_posts")
    .select("id, lang, title, body, approved_at, profiles!blog_posts_author_id_fkey ( nickname )")
    .eq("status", "approved")
    .eq("id", id)
    .maybeSingle();
  return data ? toPost(data) : null;
}

type Row = { id: number; lang: string; title: string; body: string; approved_at: string | null; profiles: unknown };
function toPost(r: Row): BlogPost {
  return {
    id: r.id,
    lang: r.lang as PostLang,
    title: r.title,
    body: r.body,
    approvedAt: r.approved_at ?? "",
    author: (r.profiles as { nickname: string | null } | null)?.nickname ?? null,
  };
}

/** Абзацы из простого текста: пустая строка — новый абзац. Без HTML. */
export const paragraphs = (body: string) =>
  body.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
