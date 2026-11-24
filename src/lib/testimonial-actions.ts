"use server";

import { headers } from "next/headers";
import { createHash, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { escapeHtml } from "@/lib/telegram/api";
import { notifyStaff } from "@/lib/staffNotify";

export type TestimonialState = { ok?: boolean; error?: "invalid" | "consent" | "photo" | "tooMany" | "save" };

const BUCKET = "testimonials";
// Браузер заранее уменьшает фото (см. ReviewForm), а у Server Actions предел тела запроса — 1 МБ.
const MAX_PHOTO_BYTES = 1024 * 1024;

/**
 * Отзыв с открытой страницы «Отзывы». Приходит скрытым — показывает администрация клуба из админки.
 * Защита от ботов, как у заявок на корпоратив: скрытое поле, минимальное время заполнения, лимиты по IP и в целом.
 */
export async function submitTestimonial(_prev: TestimonialState, formData: FormData): Promise<TestimonialState> {
  if (String(formData.get("website") ?? "")) return { ok: true };
  const openedAt = Number(formData.get("openedAt"));
  if (!Number.isFinite(openedAt) || Date.now() - openedAt < 4000) return { error: "invalid" };

  const author = String(formData.get("author") ?? "").trim().slice(0, 80);
  const company = String(formData.get("company") ?? "").trim().slice(0, 120) || null;
  const body = String(formData.get("body") ?? "").trim().slice(0, 1500);
  if (!author || body.length < 10) return { error: "invalid" };
  if (formData.get("consent") !== "on") return { error: "consent" };
  const siteLocale = String(formData.get("locale") ?? "").slice(0, 5) || null;

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = createHash("sha256").update(`mafiacl-review:${ip}`).digest("hex").slice(0, 32);

  const db = createAdminClient();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [{ count: fromIp }, { count: total }] = await Promise.all([
    db.from("testimonials").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", dayAgo),
    db.from("testimonials").select("id", { count: "exact", head: true }).eq("source", "site").gte("created_at", hourAgo),
  ]);
  if ((fromIp ?? 0) >= 3 || (total ?? 0) >= 20) return { error: "tooMany" };

  // Фото: перекодируем на сервере в квадрат 400×400 WebP — без EXIF (геометки, модель телефона).
  let photoUrl: string | null = null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PHOTO_BYTES || !file.type.startsWith("image/")) return { error: "photo" };
    try {
      const { default: sharp } = await import("sharp");
      const webp = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(400, 400, { fit: "cover", position: "attention" })
        .webp({ quality: 82 })
        .toBuffer();
      const path = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.webp`;
      const { error } = await db.storage.from(BUCKET).upload(path, webp, { contentType: "image/webp" });
      if (error) throw error;
      photoUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    } catch (e) {
      console.error("testimonial photo failed", e instanceof Error ? e.message : e);
      return { error: "photo" };
    }
  }

  const { data: club } = await db.from("clubs").select("id").eq("slug", MAIN_CLUB_SLUG).maybeSingle();
  if (!club) return { error: "save" };
  const { data: row, error } = await db
    .from("testimonials")
    .insert({
      club_id: club.id,
      kind: company ? "corporate" : "player",
      author,
      company,
      body,
      photo_url: photoUrl,
      active: false,
      source: "site",
      site_locale: siteLocale,
      ip_hash: ipHash,
    })
    .select("id")
    .single();
  if (error || !row) {
    console.error("testimonial insert failed", { code: error?.code, message: error?.message });
    return { error: "save" };
  }

  await notifyStaff(club.id, [
    `💬 <b>Новый отзыв №${row.id}</b> — ждёт проверки в админке`,
    `${escapeHtml(author)}${company ? ` · ${escapeHtml(company)}` : ""}${photoUrl ? " · 📷" : ""}`,
    escapeHtml(body.slice(0, 600)),
  ]);
  return { ok: true };
}
