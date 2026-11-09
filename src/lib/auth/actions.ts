"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

function toLocale(value: FormDataEntryValue | null): Locale {
  const v = String(value ?? "");
  return (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
}

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Разрешённые способы входа (Telegram — свой OIDC-провайдер в Supabase). */
const PROVIDERS = ["google", "facebook", "custom:telegram"] as const;
type Provider = (typeof PROVIDERS)[number];

const SCOPES: Partial<Record<Provider, string>> = {
  facebook: "email public_profile",
  "custom:telegram": "openid profile",
};

/** Кнопки «Войти через Google / Facebook / Telegram». */
export async function signInWithProvider(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const raw = String(formData.get("provider") ?? "");
  const provider = (PROVIDERS as readonly string[]).includes(raw) ? (raw as Provider) : "google";
  const next = getPathname({ href: "/account", locale });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    // custom:* провайдеры появились в supabase-js недавно, тип Provider их ещё не знает
    provider: provider as "google",
    options: {
      redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      scopes: SCOPES[provider],
      queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
    },
  });
  if (error || !data.url) {
    console.error("signInWithProvider failed", { provider, message: error?.message });
    redirect(`${next}?auth=error`);
  }
  redirect(data.url);
}

/** «Привязать Facebook/Telegram/Google» к уже вошедшему аккаунту — один профиль на все способы входа. */
export async function linkProvider(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const raw = String(formData.get("provider") ?? "");
  if (!(PROVIDERS as readonly string[]).includes(raw)) redirect(getPathname({ href: "/account", locale }));
  const provider = raw as Provider;
  const next = getPathname({ href: "/account", locale });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.linkIdentity({
    provider: provider as "google",
    options: {
      redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      scopes: SCOPES[provider],
    },
  });
  if (error || !data.url) {
    console.error("linkProvider failed", { provider, message: error?.message });
    redirect(`${next}?auth=error`);
  }
  redirect(data.url);
}

export async function signOut(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(getPathname({ href: "/account", locale }));
}

export type ProfileState = { status: "idle" | "saved" | "invalid" | "taken" | "error" };

/** Ник игрока: 2–32 символа, без пробелов по краям, уникален без учёта регистра. */
export async function updateNickname(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const nickname = String(formData.get("nickname") ?? "").trim();
  if (nickname.length < 2 || nickname.length > 32) return { status: "invalid" };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { status: "error" };

  const { error } = await supabase.from("profiles").update({ nickname }).eq("id", userId);
  if (error) {
    if (error.code === "23505") return { status: "taken" };
    console.error("updateNickname failed", { code: error.code, message: error.message });
    return { status: "error" };
  }
  revalidatePath("/", "layout");
  return { status: "saved" };
}
