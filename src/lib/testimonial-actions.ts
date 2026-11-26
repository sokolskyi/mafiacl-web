"use server";

import { headers } from "next/headers";
import { createHash, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { escapeHtml } from "@/lib/telegram/api";
import { notifyStaff } from "@/lib/staffNotify";
import { createClient } from "@/lib/supabase/server";
import { markHostReviewsSeen } from "@/lib/hostReviews";

export type TestimonialState = { ok?: boolean; error?: "invalid" | "consent" | "photo" | "logo" | "tooMany" | "save" };

const BUCKET = "testimonials";
// Браузер заранее уменьшает фото и логотип (см. ReviewForm), а у Server Actions предел тела запроса — 1 МБ на всё.
const MAX_IMAGE_BYTES = 512 * 1024;

type Db = ReturnType<typeof createAdminClient>;

/**
 * Картинка из формы → WebP в хранилище, без EXIF (геометки, модель телефона).
 * Фото автора — квадрат 400×400; логотип — целиком в рамке 400×200, прозрачный фон сохраняется.
 * null — картинки нет; "bad" — не картинка, слишком большая или не прочиталась.
 */
async function storeImage(db: Db, file: FormDataEntryValue | null, kind: "photo" | "logo"): Promise<string | null | "bad"> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_IMAGE_BYTES || !file.type.startsWith("image/")) return "bad";
  try {
    const { default: sharp } = await import("sharp");
    const img = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 }).rotate();
    const webp = await (kind === "photo"
      ? img.resize(400, 400, { fit: "cover", position: "attention" }).webp({ quality: 82 })
      : img.resize(400, 200, { fit: "inside", withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100 })
    ).toBuffer();
    const path = `${new Date().toISOString().slice(0, 7)}/${kind === "logo" ? "logo-" : ""}${randomUUID()}.webp`;
    const { error } = await db.storage.from(BUCKET).upload(path, webp, { contentType: "image/webp" });
    if (error) throw error;
    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error(`testimonial ${kind} failed`, e instanceof Error ? e.message : e);
    return "bad";
  }
}

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
  const hostRaw = Number(formData.get("host"));
  const hostId = Number.isInteger(hostRaw) && hostRaw > 0 ? hostRaw : null;

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

  const photoUrl = await storeImage(db, formData.get("photo"), "photo");
  if (photoUrl === "bad") return { error: "photo" };
  // Логотип — только вместе с названием компании/организации.
  const logoUrl = company ? await storeImage(db, formData.get("logo"), "logo") : null;
  if (logoUrl === "bad") return { error: "logo" };

  const { data: club } = await db.from("clubs").select("id").eq("slug", MAIN_CLUB_SLUG).maybeSingle();
  if (!club) return { error: "save" };
  // Ведущий — только действующий ведущий этого клуба, иначе не сохраняем выбор.
  let host: { id: number; nickname: string } | null = null;
  if (hostId) {
    const { data } = await db.from("hosts").select("id, nickname").eq("id", hostId).eq("club_id", club.id).eq("active", true).maybeSingle();
    host = data ?? null;
  }
  const { data: row, error } = await db
    .from("testimonials")
    .insert({
      club_id: club.id,
      kind: company ? "corporate" : "player",
      author,
      company,
      body,
      photo_url: photoUrl,
      company_logo_url: logoUrl,
      active: false,
      source: "site",
      site_locale: siteLocale,
      ip_hash: ipHash,
      host_id: host?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !row) {
    console.error("testimonial insert failed", { code: error?.code, message: error?.message });
    return { error: "save" };
  }

  await notifyStaff(club.id, [
    `💬 <b>Новый отзыв №${row.id}</b> — ждёт проверки в админке`,
    `${escapeHtml(author)}${company ? ` · ${escapeHtml(company)}` : ""}${host ? ` · ведущий ${escapeHtml(host.nickname)}` : ""}${photoUrl ? " · 📷" : ""}${logoUrl ? " · 🏷 лого" : ""}`,
    escapeHtml(body.slice(0, 600)),
  ]);
  return { ok: true };
}

/** Ведущий открыл кабинет с «Отзывами о вас» — отметки «новый» больше не показываем. */
export async function markMyReviewsSeen() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (userId) await markHostReviewsSeen(userId);
}
