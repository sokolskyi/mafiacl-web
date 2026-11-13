"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getStaffContext } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BLOG_POSTS_TAG, POST_LANGS, POST_LIMITS } from "@/lib/blog-posts";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { SUPABASE_URL } from "@/lib/supabase/env";

const MAX_IMAGES = 4;
const imagePrefix = (userId: string) => `${SUPABASE_URL}/storage/v1/object/public/blog/${userId}/`;

function toLocale(value: FormDataEntryValue | null): Locale {
  const v = String(value ?? "");
  return (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
}

/** Игрок отправляет статью на модерацию. Только одобренные аккаунты, не больше 2 статей в ожидании. */
export async function submitPost(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = getPathname({ href: "/account", locale });
  const title = String(formData.get("title") ?? "").trim().replace(/\s+/g, " ");
  const body = String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim();
  const lang = String(formData.get("lang") ?? "");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect(back);
  if (
    title.length < POST_LIMITS.title[0] || title.length > POST_LIMITS.title[1] ||
    body.length < POST_LIMITS.body[0] || body.length > POST_LIMITS.body[1] ||
    !(POST_LANGS as readonly string[]).includes(lang)
  ) redirect(`${back}?post=invalid#blog`);

  // Картинки — только загруженные этим игроком в хранилище блога.
  const images = String(formData.get("images") ?? "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  if (images.length > MAX_IMAGES || images.some((u) => !u.startsWith(imagePrefix(userId)) || !/^[\w\-/:.]+\.webp$/.test(u))) {
    redirect(`${back}?post=invalid#blog`);
  }

  const admin = createAdminClient();
  const [{ data: profile }, { data: club }, { count }] = await Promise.all([
    admin.from("profiles").select("verification").eq("id", userId).maybeSingle(),
    admin.from("clubs").select("id").eq("slug", MAIN_CLUB_SLUG).maybeSingle(),
    admin.from("blog_posts").select("id", { count: "exact", head: true }).eq("author_id", userId).eq("status", "pending"),
  ]);
  if (profile?.verification !== "approved" || !club) redirect(`${back}?post=unverified#blog`);
  if ((count ?? 0) >= 2) redirect(`${back}?post=tooMany#blog`);
  const { error } = await admin.from("blog_posts").insert({ club_id: club.id, author_id: userId, lang, title, body, images });
  if (error) {
    console.error("submitPost failed", { code: error.code, message: error.message });
    redirect(`${back}?post=error#blog`);
  }
  redirect(`${back}?post=sent#blog`);
}

/** Админ одобряет или отклоняет статью. За первую одобренную статью в году база начисляет +15 Respect. */
export async function decidePost(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = getPathname({ href: "/admin", locale });
  const id = Number(formData.get("postId"));
  const approve = formData.get("decision") === "approve";
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  if (!Number.isInteger(id) || id < 1) redirect(`${back}?error=invalid#posts`);
  const ctx = await getStaffContext();
  const clubIds = (ctx?.clubs ?? []).filter((c) => c.roles.includes("owner") || c.roles.includes("admin")).map((c) => c.id);
  if (!ctx || clubIds.length === 0) redirect(`${back}?error=save#posts`);
  const { error } = await createAdminClient()
    .from("blog_posts")
    .update(approve ? { status: "approved", approved_by: ctx.userId, review_note: note } : { status: "rejected", review_note: note })
    .eq("id", id)
    .in("club_id", clubIds)
    .eq("status", "pending");
  if (error) {
    console.error("decidePost failed", { id, code: error.code, message: error.message });
    redirect(`${back}?error=save#posts`);
  }
  updateTag(BLOG_POSTS_TAG);
  redirect(`${back}#posts`);
}

/** Одноразовые ссылки для загрузки картинок к статье (до 4). Только одобренные игроки. */
export async function createPostImageUploads(count: number) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { error: "forbidden" as const };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("verification").eq("id", userId).maybeSingle();
  if (profile?.verification !== "approved") return { error: "forbidden" as const };
  const n = Math.min(Math.max(Math.trunc(count), 1), MAX_IMAGES);
  const uploads: { path: string; token: string; publicUrl: string }[] = [];
  for (let i = 0; i < n; i++) {
    const path = `${userId}/${crypto.randomUUID()}.webp`;
    const { data: up, error } = await admin.storage.from("blog").createSignedUploadUrl(path);
    if (error || !up) {
      console.error("createPostImageUploads failed", { message: error?.message });
      return { error: "failed" as const };
    }
    uploads.push({ path: up.path, token: up.token, publicUrl: admin.storage.from("blog").getPublicUrl(up.path).data.publicUrl });
  }
  return { uploads };
}
