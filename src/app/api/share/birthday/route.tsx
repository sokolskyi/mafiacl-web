import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { getClubSince } from "@/lib/aliases";
import { getPlayer, type PlayerRole } from "@/lib/players";
import { avatar, BG, CREAM, fonts, FONT, GOLD_200, GOLD_400, GOLD_500, logo, MUTED } from "@/lib/shareImage";

/**
 * Открытка ко дню рождения в виде карты роли «Именинник»: f=story (1080×1920) или f=post (1080×1350).
 * Без даты и возраста — только ник, аватар и пара фактов из клубной статистики.
 */

const SIZE = { story: { width: 1080, height: 1920 }, post: { width: 1080, height: 1350 } } as const;
type Format = keyof typeof SIZE;
const ROLES: PlayerRole[] = ["civilian", "sheriff", "mafia", "don"];
const CARD_BG = "linear-gradient(170deg, #5e1727 0%, #3a0a14 55%, #24050c 100%)";

/** Звёздочка-«масть» в углах карты. */
function Pip({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill={GOLD_400} d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6z" />
    </svg>
  );
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const nick = (q.get("nick") ?? "").slice(0, 32);
  const format: Format = q.get("f") === "post" ? "post" : "story";
  // gift=0 — без плашки «+10 Respect» (если подарок в этом году не начислен).
  const gift = q.get("gift") !== "0";
  const l = q.get("l");
  const locale: Locale = (routing.locales as readonly string[]).includes(l ?? "") ? (l as Locale) : routing.defaultLocale;

  const player = await getPlayer(nick);
  if (!player) return new Response("not found", { status: 404 });

  const [t, tm, fontData, logoSrc, avatarSrc, manualSince] = await Promise.all([
    getTranslations({ locale, namespace: "birthdayCard" }),
    getTranslations({ locale, namespace: "match" }),
    fonts(),
    logo(),
    avatar(player.avatarUrl),
    getClubSince().catch(() => ({}) as Record<string, number>),
  ]);

  // Факты на карте: с какого года в клубе, сколько игр, любимая роль (если сыграно достаточно).
  const years = [...player.archive.map((a) => a.year), ...(player.since ? [Number(player.since.slice(0, 4))] : [])].filter(
    (y) => Number.isFinite(y) && y > 2000,
  );
  const manual = [player.nickname, ...player.aliases].map((n) => manualSince[n.toLowerCase()]).find(Boolean);
  const sinceYear = manual ?? (years.length ? Math.min(...years) : null);
  const s = player.stats;
  const fav = ROLES.map((r) => [r, s.byRole[r].games] as const).sort((a, b) => b[1] - a[1])[0];
  const facts = [
    sinceYear && sinceYear < new Date().getFullYear() ? t("since", { year: sinceYear }) : null,
    s.games > 0 ? t("games", { n: s.games }) : null,
    fav && fav[1] >= 5 ? t("favRole", { role: tm(`role.${fav[0]}`) }) : null,
  ].filter((x): x is string => Boolean(x));

  const story = format === "story";
  const k = story ? 1 : 0.7;
  const px = (n: number) => Math.round(n * k);
  // Длинный ник уменьшаем, чтобы влез в карту.
  const nickSize = px(Math.min(120, (120 * 11) / Math.max(11, player.nickname.length)));
  const avatarSize = px(380);

  const Avatar = avatarSrc ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarSrc} width={avatarSize} height={avatarSize} alt="" style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize, objectFit: "cover", border: `${px(10)}px solid ${GOLD_400}` }} />
  ) : (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: avatarSize, height: avatarSize, borderRadius: avatarSize, background: "#2e0710", border: `${px(10)}px solid ${GOLD_400}`, color: GOLD_200, fontSize: avatarSize * 0.45, fontWeight: 800 }}>
      {player.nickname.slice(0, 1).toUpperCase()}
    </div>
  );

  const Corner = ({ flip }: { flip?: boolean }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: px(4), transform: flip ? "rotate(180deg)" : undefined }}>
      <div style={{ display: "flex", fontSize: px(44), fontWeight: 800, color: GOLD_400, lineHeight: 1 }}>MCL</div>
      <Pip size={px(34)} />
    </div>
  );

  const body = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "100%", padding: `${px(70)}px ${px(80)}px ${px(56)}px`, background: BG, color: CREAM, fontFamily: FONT }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} alt="" width={px(300)} height={px(107)} />
      <div style={{ display: "flex", marginTop: px(40), fontSize: px(104), fontWeight: 800, lineHeight: 1, textTransform: "uppercase", textAlign: "center" }}>{t("happy")}</div>

      {/* Карта роли */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: px(820), marginTop: px(48), padding: px(36), borderRadius: px(48), background: CARD_BG, border: `${px(6)}px solid ${GOLD_400}`, boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Corner />
          <div style={{ display: "flex", marginTop: px(6), fontSize: px(32), color: MUTED, letterSpacing: px(6), textTransform: "uppercase" }}>{t("cardLabel")}</div>
          <div style={{ display: "flex", width: px(80) }} />
        </div>
        <div style={{ display: "flex", marginTop: px(20) }}>{Avatar}</div>
        <div style={{ display: "flex", marginTop: px(36), fontSize: px(92), fontWeight: 800, color: GOLD_400, letterSpacing: px(4), textTransform: "uppercase", lineHeight: 1 }}>{t("role")}</div>
        <div style={{ display: "flex", marginTop: px(18), fontSize: nickSize, fontWeight: 800, lineHeight: 1.05, textAlign: "center" }}>{player.nickname}</div>
        <div style={{ display: "flex", width: "55%", height: px(4), marginTop: px(32), borderRadius: px(4), background: GOLD_500 }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: px(10), marginTop: px(26), minHeight: px(150), fontSize: px(42), color: MUTED }}>
          {facts.map((f) => (
            <div key={f} style={{ display: "flex" }}>{f}</div>
          ))}
        </div>
        <div style={{ display: "flex", width: "100%", justifyContent: "flex-end" }}>
          <Corner flip />
        </div>
      </div>

      {gift && (
      <div style={{ display: "flex", alignItems: "center", gap: px(16), marginTop: px(40), padding: `${px(16)}px ${px(36)}px`, borderRadius: px(60), background: "rgba(251,191,36,0.16)", border: `${px(3)}px solid rgba(251,191,36,0.45)`, color: GOLD_200, fontSize: px(42), fontWeight: 800 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: px(52), height: px(52), borderRadius: px(52), background: GOLD_400, color: "#3a0a14", fontSize: px(34), fontWeight: 800 }}>R</div>
        {t("gift")}
      </div>
      )}
      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", fontSize: px(34), color: MUTED }}>{t("footer")}</div>
    </div>
  );

  return new ImageResponse(body, {
    ...SIZE[format],
    fonts: fontData,
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
