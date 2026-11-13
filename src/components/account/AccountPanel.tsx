import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { linkProvider, signInWithProvider, signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Link } from "@/i18n/navigation";
import { EmailSignIn } from "./EmailSignIn";
import { NicknameForm } from "./NicknameForm";
import { headers } from "next/headers";
import { recordSignupCountry } from "@/lib/members";
import { formatMemberNo } from "@/lib/memberNo";
import { PlayerShare } from "@/components/players/PlayerShare";
import { connectTelegram } from "@/lib/telegram/actions";

/** Читает сессию — поэтому рендерится только внутри <Suspense>. */
export async function AccountPanel({ locale, authError }: { locale: Locale; authError: boolean }) {
  const t = await getTranslations({ locale, namespace: "account" });
  if (!isSupabaseConfigured) return <p className="mt-10 text-neutral-400">{t("notConfigured")}</p>;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  if (!userId) {
    return (
      <section className="mt-10 max-w-md rounded-lg border border-white/10 bg-neutral-950 p-6">
        <h2 className="text-xl font-bold">{t("signInTitle")}</h2>
        <p className="mt-2 text-neutral-400">{t("signInText")}</p>
        {authError && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {t("authError")}
          </p>
        )}
        <div className="mt-6 space-y-3">
          <ProviderButton locale={locale} provider="google" label={t("google")} className="bg-white text-black hover:bg-neutral-200">
            <GoogleIcon />
          </ProviderButton>
          <ProviderButton locale={locale} provider="facebook" label={t("facebook")} className="bg-[#1877F2] text-white hover:bg-[#166fe0]">
            <FacebookIcon />
          </ProviderButton>
          <ProviderButton locale={locale} provider="custom:telegram" label={t("telegram")} className="bg-[#229ED9] text-white hover:bg-[#1f91c7]">
            <TelegramIcon />
          </ProviderButton>
        </div>
        <div className="my-5 flex items-center gap-3 text-xs uppercase text-neutral-500">
          <span className="h-px flex-1 bg-white/10" />
          {t("or")}
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <EmailSignIn locale={locale} />
        <p className="mt-6 border-t border-white/10 pt-4 text-sm text-neutral-300">
          <span aria-hidden="true">🇺🇦 </span>
          {t("warNotice")}
        </p>
      </section>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, display_name, avatar_url, city, verification, member_no")
    .eq("id", userId)
    .single();
  const name = profile?.nickname ?? profile?.display_name ?? "";
  const { count: staffRoles } = await supabase
    .from("club_staff")
    .select("club_id", { count: "exact", head: true })
    .eq("profile_id", userId);
  const { data: priv } = await supabase
    .from("profile_private")
    .select("telegram_chat_id")
    .eq("profile_id", userId)
    .maybeSingle();
  const telegramOn = Boolean(priv?.telegram_chat_id);
  if (profile?.verification === "pending") {
    await recordSignupCountry(userId, (await headers()).get("x-vercel-ip-country"));
  }
  const { data: ids } = await supabase.auth.getUserIdentities();
  const linked = new Set((ids?.identities ?? []).map((i) => i.provider));
  const methods = [
    { provider: "google", label: "Google", icon: <GoogleIcon /> },
    { provider: "facebook", label: "Facebook", icon: <FacebookIcon /> },
    { provider: "custom:telegram", label: "Telegram", icon: <TelegramIcon /> },
  ];

  return (
    <section className="mt-10">
      <div className="flex items-center gap-4">
        {profile?.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            width={56}
            height={56}
            referrerPolicy="no-referrer"
            className="rounded-full"
          />
        )}
        <div>
          <p className="text-2xl font-bold">{t("hello", { name })}</p>
          {profile?.member_no && <p className="text-sm text-neutral-400">ID {formatMemberNo(profile.member_no)}</p>}
        </div>
      </div>
      {profile && profile.verification !== "approved" && (
        <p role="status" className={`mt-6 max-w-xl rounded border p-4 text-sm ${profile.verification === "rejected" ? "border-red-400/50 bg-red-600/15 text-red-200" : "border-amber-400/40 bg-amber-500/10 text-amber-100"}`}>
          {t(profile.verification === "rejected" ? "verificationRejected" : "verificationPending")}
          {profile.verification === "pending" && !telegramOn && <> {t("verificationBotHint")}</>}
        </p>
      )}
      {(staffRoles ?? 0) > 0 && (
        <p className="mt-6">
          <Link href="/admin" className="font-semibold text-red-400 hover:text-red-300">
            {t("admin")}
          </Link>
        </p>
      )}
      {profile?.nickname && (
        <p className="mt-4">
          <Link href={{ pathname: "/players/[nick]", params: { nick: profile.nickname } }} className="font-semibold text-red-400 hover:text-red-300">
            {t("myPage")}
          </Link>
        </p>
      )}
      {profile?.nickname && (
        <div className="mt-3">
          <PlayerShare locale={locale} nickname={profile.nickname} />
        </div>
      )}
      <NicknameForm current={profile?.nickname ?? null} city={profile?.city ?? null} />
      <section className="mt-10 max-w-md">
        <h2 className="text-sm font-semibold">{t("loginMethods")}</h2>
        <p className="mt-1 text-sm text-neutral-400">{t("loginMethodsHint")}</p>
        {authError && (
          <p role="alert" className="mt-2 text-sm text-red-400">
            {t("linkError")}
          </p>
        )}
        <ul className="mt-3 divide-y divide-white/10 rounded border border-white/10">
          {methods.map((m) => (
            <li key={m.provider} className="flex items-center gap-3 px-4 py-3">
              {m.icon}
              <span className="flex-1">{m.label}</span>
              {linked.has(m.provider) ? (
                <span className="text-sm text-green-400">✓ {t("linked")}</span>
              ) : (
                <form action={linkProvider}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="provider" value={m.provider} />
                  <button type="submit" className="text-sm font-semibold text-red-400 hover:text-red-300">
                    {t("link")}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-10 max-w-md">
        <h2 className="text-sm font-semibold">{t("botTitle")}</h2>
        <p className="mt-1 text-sm text-neutral-400">{t("botHint")}</p>
        {telegramOn ? (
          <p className="mt-3 text-sm text-green-400">✓ {t("botOn")}</p>
        ) : (
          <form action={connectTelegram} className="mt-3">
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="flex items-center gap-2 rounded bg-[#229ED9] px-4 py-2 font-semibold hover:bg-[#1f91c7]">
              <TelegramIcon />
              {t("botConnect")}
            </button>
          </form>
        )}
      </section>
      <form action={signOut} className="mt-10">
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className="text-sm text-neutral-400 underline hover:text-white">
          {t("signOut")}
        </button>
      </form>
    </section>
  );
}

function ProviderButton({
  locale,
  provider,
  label,
  className,
  children,
}: {
  locale: Locale;
  provider: string;
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <form action={signInWithProvider}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="provider" value={provider} />
      <button
        type="submit"
        className={`flex w-full items-center justify-center gap-3 rounded px-4 py-2.5 font-semibold ${className}`}
      >
        {children}
        {label}
      </button>
    </form>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.78 15.27 9.4 20.6c.54 0 .78-.23 1.06-.51l2.55-2.44 5.28 3.87c.97.53 1.65.25 1.91-.89l3.46-16.24c.31-1.43-.52-1.99-1.46-1.64L1.86 10.6c-1.39.54-1.37 1.32-.24 1.67l5.2 1.62 12.08-7.6c.57-.37 1.09-.17.66.21z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
