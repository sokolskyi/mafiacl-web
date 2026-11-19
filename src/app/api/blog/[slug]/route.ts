import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/admin/queries";
import { postIdOf } from "@/lib/blog-posts";
import { COMMENT_MAX, isReaction, SLUG_RE } from "@/lib/blog-social-shared";

const VISITOR_COOKIE = "mcl_vid";

/** Статья опубликована: одобренная статья игрока или опубликованный обзор сезона. */
async function exists(db: ReturnType<typeof createAdminClient>, slug: string): Promise<boolean> {
  const id = postIdOf(slug);
  if (id) {
    const { data } = await db.from("blog_posts").select("id").eq("id", id).eq("status", "approved").maybeSingle();
    return !!data;
  }
  const month = /^season-review-(\d{4}-\d{2})$/.exec(slug)?.[1];
  if (!month) return false;
  const { data } = await db.from("season_reviews").select("month").eq("month", `${month}-01`).eq("published", true).limit(1);
  return !!data?.length;
}

async function whoAmI() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}

/** Анонимный посетитель — случайный id в cookie (на год). Вошедший — id аккаунта. */
async function visitorId(userId: string | null, create: boolean): Promise<string | null> {
  if (userId) return `u:${userId}`;
  const jar = await cookies();
  const v = jar.get(VISITOR_COOKIE)?.value;
  if (v && /^[0-9a-f-]{36}$/.test(v)) return `a:${v}`;
  if (!create) return null;
  const id = randomUUID();
  jar.set(VISITOR_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
  return `a:${id}`;
}

async function snapshot(db: ReturnType<typeof createAdminClient>, slug: string, userId: string | null) {
  const visitor = await visitorId(userId, false);
  const [{ data: stats }, { data: mine }, { data: comments }, { data: me }, staff] = await Promise.all([
    db.rpc("blog_stats", { p_slugs: [slug] }),
    visitor ? db.from("blog_reactions").select("kind").eq("slug", slug).eq("visitor", visitor) : Promise.resolve({ data: [] }),
    db
      .from("blog_comments")
      .select("id, body, created_at, profile_id, profiles ( nickname, avatar_url )")
      .eq("slug", slug)
      .order("created_at", { ascending: false })
      .limit(200),
    userId ? db.from("profiles").select("nickname").eq("id", userId).maybeSingle() : Promise.resolve({ data: null }),
    userId ? getStaffContext() : Promise.resolve(null),
  ]);
  const isModerator = !!staff?.clubs.some((c) => c.roles.includes("owner") || c.roles.includes("admin"));
  const s = ((stats ?? []) as { views: number; reactions: Record<string, number>; comments: number }[])[0];
  return {
    views: s?.views ?? 0,
    reactions: s?.reactions ?? {},
    mine: (mine ?? []).map((r: { kind: string }) => r.kind),
    comments: (comments ?? []).map((c) => {
      const p = c.profiles as unknown as { nickname: string | null; avatar_url: string | null } | null;
      return {
        id: c.id as number,
        body: c.body as string,
        createdAt: c.created_at as string,
        nickname: p?.nickname ?? null,
        avatarUrl: p?.avatar_url?.startsWith("https://") ? p.avatar_url : null,
        canDelete: !!userId && (c.profile_id === userId || isModerator),
      };
    }),
    me: userId ? { nickname: (me as { nickname: string | null } | null)?.nickname ?? null } : null,
  };
}

export type BlogSnapshot = Awaited<ReturnType<typeof snapshot>>;

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !!origin && origin === request.nextUrl.origin;
}

export async function GET(_request: NextRequest, { params }: RouteContext<"/api/blog/[slug]">) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return new Response("not found", { status: 404 });
  const db = createAdminClient();
  const data = await snapshot(db, slug, await whoAmI());
  return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
}

/**
 * {"action":"view"} — просмотр (один в день на посетителя); {"action":"react","kind":"fire"} — поставить или снять реакцию;
 * {"action":"comment","body":"…"} — комментарий (только вошедшим с ником); {"action":"delete","id":1} — удалить свой (или любой — админ клуба).
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/blog/[slug]">) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return new Response("not found", { status: 404 });
  if (!sameOrigin(request)) return new Response("forbidden", { status: 403 });
  const body = (await request.json().catch(() => null)) as { action?: unknown; kind?: unknown; body?: unknown; id?: unknown } | null;
  if (!body) return new Response("bad request", { status: 400 });

  const db = createAdminClient();
  if (!(await exists(db, slug))) return new Response("not found", { status: 404 });
  const userId = await whoAmI();

  if (body.action === "view") {
    const visitor = await visitorId(userId, true);
    await db.from("blog_views").upsert({ slug, visitor }, { ignoreDuplicates: true });
  } else if (body.action === "react" && isReaction(body.kind)) {
    const visitor = (await visitorId(userId, true))!;
    const { data: had } = await db.from("blog_reactions").select("kind").eq("slug", slug).eq("visitor", visitor).eq("kind", body.kind).maybeSingle();
    if (had) await db.from("blog_reactions").delete().eq("slug", slug).eq("visitor", visitor).eq("kind", body.kind);
    else await db.from("blog_reactions").insert({ slug, visitor, kind: body.kind });
  } else if (body.action === "comment" && typeof body.body === "string") {
    if (!userId) return Response.json({ error: "signIn" }, { status: 401 });
    const text = body.body.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!text || text.length > COMMENT_MAX) return Response.json({ error: "invalid" }, { status: 400 });
    const { data: me } = await db.from("profiles").select("nickname").eq("id", userId).maybeSingle();
    if (!me?.nickname) return Response.json({ error: "nickname" }, { status: 403 });
    // Не больше 5 комментариев за 10 минут.
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await db.from("blog_comments").select("id", { count: "exact", head: true }).eq("profile_id", userId).gte("created_at", since);
    if ((count ?? 0) >= 5) return Response.json({ error: "tooFast" }, { status: 429 });
    const { error } = await db.from("blog_comments").insert({ slug, profile_id: userId, body: text });
    if (error) {
      console.error("blog comment failed", { code: error.code, message: error.message });
      return Response.json({ error: "save" }, { status: 500 });
    }
  } else if (body.action === "delete" && Number.isInteger(body.id)) {
    if (!userId) return Response.json({ error: "signIn" }, { status: 401 });
    const staff = await getStaffContext();
    const isModerator = !!staff?.clubs.some((c) => c.roles.includes("owner") || c.roles.includes("admin"));
    let q = db.from("blog_comments").delete().eq("id", body.id as number).eq("slug", slug);
    if (!isModerator) q = q.eq("profile_id", userId);
    const { error } = await q;
    if (error) return Response.json({ error: "save" }, { status: 500 });
  } else {
    return new Response("bad request", { status: 400 });
  }

  return Response.json(await snapshot(db, slug, userId), { headers: { "Cache-Control": "private, no-store" } });
}
