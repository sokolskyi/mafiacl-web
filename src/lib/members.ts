import "server-only";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

export type MemberRequest = {
  id: string;
  nickname: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  verification: "pending" | "rejected";
  email: string | null;
  provider: string;
  country: string | null;
  telegramLinked: boolean;
};

/** Страна по IP (заголовок Vercel) — один раз, пока заявка не рассмотрена. Ошибки не мешают входу. */
export async function recordSignupCountry(userId: string | undefined, country: string | null) {
  if (!userId || !country || !isAdminConfigured) return;
  try {
    const { error } = await createAdminClient().rpc("record_signup_country", { p_profile: userId, p_country: country });
    if (error) console.error("recordSignupCountry failed", { code: error.code, message: error.message });
  } catch (e) {
    console.error("recordSignupCountry failed", e);
  }
}

/** Заявки на верификацию для админки. Права проверяет вызывающий код. */
export async function getMemberRequests(): Promise<MemberRequest[]> {
  if (!isAdminConfigured) return [];
  const { data, error } = await createAdminClient().rpc("member_requests");
  if (error) {
    console.error("member_requests failed", { code: error.code, message: error.message });
    return [];
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    nickname: (r.nickname as string) ?? null,
    displayName: (r.display_name as string) ?? null,
    avatarUrl: (r.avatar_url as string) ?? null,
    createdAt: r.created_at as string,
    verification: r.verification as "pending" | "rejected",
    email: (r.email as string) ?? null,
    provider: (r.provider as string) ?? "email",
    country: (r.signup_country as string) ?? null,
    telegramLinked: Boolean(r.telegram_linked),
  }));
}
