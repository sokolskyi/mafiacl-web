"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getStaffContext } from "@/lib/admin/queries";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { REVIEWS_TAG } from "@/lib/reviews/queries";
import { currentMonth, generateReview } from "@/lib/reviews/save";
import { postReview } from "@/lib/reviews/telegram";

function toLocale(value: FormDataEntryValue | null): Locale {
  const v = String(value ?? "");
  return (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
}

/**
 * Кнопка в админке: собрать обзор за текущий месяц сейчас.
 * Пишет служебным ключом, поэтому права (owner/admin главного клуба) проверяем здесь.
 */
export async function generateReviewNow(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = `${getPathname({ href: "/admin", locale })}`;
  const ctx = await getStaffContext();
  const club = ctx?.clubs.find((c) => c.slug === MAIN_CLUB_SLUG);
  if (!club || !(club.roles.includes("owner") || club.roles.includes("admin"))) redirect(`${back}?error=forbidden#reviews`);
  try {
    await generateReview(currentMonth(), true);
  } catch (e) {
    console.error("generateReviewNow failed", { message: e instanceof Error ? e.message : String(e) });
    redirect(`${back}?error=save#reviews`);
  }
  updateTag(REVIEWS_TAG);
  redirect(`${back}#reviews`);
}

/** Скрыть/показать обзор (через RLS: только owner/admin клуба). */
export async function setReviewPublished(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = `${getPathname({ href: "/admin", locale })}#reviews`;
  const id = Number(formData.get("reviewId"));
  const published = formData.get("published") === "1";
  if (!Number.isInteger(id) || id < 1) redirect(back);
  const ctx = await getStaffContext();
  if (!ctx) redirect(back);
  const { error } = await ctx.supabase.from("season_reviews").update({ published }).eq("id", id);
  if (error) console.error("setReviewPublished failed", { id, code: error.code, message: error.message });
  updateTag(REVIEWS_TAG);
  redirect(back);
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Кнопка в админке: отправить обзор в Telegram-канал MafiaCL Kings (только owner/admin). */
export async function postReviewNow(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const back = `${getPathname({ href: "/admin", locale })}`;
  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) redirect(`${back}#reviews`);
  const ctx = await getStaffContext();
  const club = ctx?.clubs.find((c) => c.slug === MAIN_CLUB_SLUG);
  if (!club || !(club.roles.includes("owner") || club.roles.includes("admin"))) redirect(`${back}?error=forbidden#reviews`);
  try {
    await postReview(month, await origin());
  } catch (e) {
    console.error("postReviewNow failed", { month, message: e instanceof Error ? e.message : String(e) });
    redirect(`${back}?error=bot#reviews`);
  }
  updateTag(REVIEWS_TAG);
  redirect(`${back}?posted=1#reviews`);
}
