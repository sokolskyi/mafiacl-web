import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { cityLabel } from "@/lib/cities";
import { getPlayer, headlineStats, type PlayerRole } from "@/lib/players";
import { getTitles, belongsTo } from "@/lib/badges";
import { MAIN_CLUB_SLUG } from "@/lib/site";
import { formatMemberNo } from "@/lib/memberNo";
import { avatar, BG, CREAM, fonts, FONT, GOLD_200, GOLD_400, logo, MUTED, RED, SOFT } from "@/lib/shareImage";

/** Картинка для соцсетей с личной статистикой игрока: f=story (1080×1920) или f=post (1200×630). */

const SIZE = { story: { width: 1080, height: 1920 }, post: { width: 1200, height: 630 } } as const;
type Format = keyof typeof SIZE;

const ROLES: PlayerRole[] = ["civilian", "sheriff", "mafia", "don"];
const ROLE_COLOR: Record<PlayerRole, string> = { civilian: "#ff8274", sheriff: "#fcd34d", mafia: SOFT, don: SOFT };

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const nick = (q.get("nick") ?? "").slice(0, 32);
  const format: Format = q.get("f") === "post" ? "post" : "story";
  const l = q.get("l");
  const locale: Locale = (routing.locales as readonly string[]).includes(l ?? "") ? (l as Locale) : routing.defaultLocale;

  const player = await getPlayer(nick);
  if (!player) return new Response("not found", { status: 404 });

  const [t, tm, fontData, logoSrc, avatarSrc, allTitles] = await Promise.all([
    getTranslations({ locale, namespace: "player" }),
    getTranslations({ locale, namespace: "match" }),
    fonts(),
    logo(),
    avatar(player.avatarUrl),
    getTitles(MAIN_CLUB_SLUG).catch(() => []),
  ]);
  const titles = allTitles.filter((x) => belongsTo(x, player.id, player.nickname)).slice(0, 4);

  const s = player.stats;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const stats = headlineStats(player, (key) => t(key), locale);
  const story = format === "story";
  const k = story ? 1 : 0.62; // масштаб шрифтов и отступов для горизонтальной карточки

  const Avatar = ({ size }: { size: number }) =>
    avatarSrc ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarSrc} width={size} height={size} alt="" style={{ width: size, height: size, borderRadius: size, objectFit: "cover", border: `${Math.round(size / 40)}px solid ${RED}` }} />
    ) : (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: size, background: "#2e0710", border: `${Math.round(size / 40)}px solid ${RED}`, color: MUTED, fontSize: size * 0.45, fontWeight: 800 }}>
        {player.nickname.slice(0, 1).toUpperCase()}
      </div>
    );

  const StatBox = ([label, value]: [string, string]) => (
    <div key={label} style={{ display: "flex", flexDirection: "column", flex: 1, padding: `${28 * k}px ${32 * k}px`, borderRadius: 24 * k, background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.12)" }}>
      <div style={{ fontSize: 34 * k, color: MUTED }}>{label}</div>
      <div style={{ fontSize: 96 * k, fontWeight: 800, color: CREAM, lineHeight: 1.05 }}>{value}</div>
    </div>
  );

  const Roles = (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 * k, width: "100%" }}>
      {ROLES.map((r) => {
        const x = s.byRole[r];
        const share = x.games ? x.wins / x.games : 0;
        return (
          <div key={r} style={{ display: "flex", alignItems: "center", gap: 24 * k, fontSize: 40 * k }}>
            <div style={{ display: "flex", width: 260 * k, color: ROLE_COLOR[r], fontWeight: 800 }}>{tm(`role.${r}`)}</div>
            <div style={{ display: "flex", flex: 1, height: 22 * k, borderRadius: 22 * k, background: "rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", width: `${Math.round(share * 100)}%`, height: "100%", borderRadius: 22 * k, background: RED }} />
            </div>
            <div style={{ display: "flex", width: 210 * k, justifyContent: "flex-end", color: SOFT }}>
              {x.games ? `${pct(x.wins, x.games)} · ${x.games}` : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );

  const Titles = titles.length > 0 && (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14 * k, justifyContent: story ? "center" : "flex-start" }}>
      {titles.map((x) => (
        <div key={x.id} style={{ display: "flex", padding: `${8 * k}px ${22 * k}px`, borderRadius: 14 * k, background: "rgba(251,191,36,0.18)", color: GOLD_200, fontSize: 34 * k }}>
          <svg width={30 * k} height={30 * k} viewBox="0 0 24 24" style={{ marginRight: 10 * k, marginTop: 4 * k }}>
            <path
              fill={GOLD_400}
              d={x.kind === "season_champion" ? "M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6z" : "M3 18h18l-1.5-10-4.5 4-3-7-3 7-4.5-4z"}
            />
          </svg>
          {t(`title.${x.kind}`)} · {x.label}
        </div>
      ))}
    </div>
  );

  // eslint-disable-next-line @next/next/no-img-element
  const Logo = <img src={logoSrc} alt="" width={story ? 340 : 230} height={story ? 121 : 82} />;
  const Footer = <div style={{ display: "flex", fontSize: 34 * k, color: MUTED }}>mafiacl.com · {t("shareCta")}</div>;

  const body = story ? (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "100%", padding: "80px 80px 70px", background: BG, color: CREAM, fontFamily: FONT }}>
      {Logo}
      <div style={{ display: "flex", marginTop: 70 }}>
        <Avatar size={320} />
      </div>
      <div style={{ display: "flex", marginTop: 40, fontSize: 130, fontWeight: 800, lineHeight: 1, textAlign: "center" }}>{player.nickname}</div>
      <div style={{ display: "flex", marginTop: 20, fontSize: 40, color: MUTED }}>
        {[player.memberNo ? `ID ${formatMemberNo(player.memberNo)}` : null, cityLabel(player.city, locale), t("shareClub")].filter(Boolean).join(" · ")}
      </div>
      <div style={{ display: "flex", marginTop: 28 }}>{Titles}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", marginTop: 48 }}>
        <div style={{ display: "flex", gap: 24 }}>{stats.slice(0, 2).map(StatBox)}</div>
        <div style={{ display: "flex", gap: 24 }}>{stats.slice(2).map(StatBox)}</div>
      </div>
      {s.games > 0 && (
        <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 48, gap: 24 }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800 }}>{t("byRole")}</div>
          {Roles}
        </div>
      )}
      <div style={{ display: "flex", flex: 1 }} />
      {Footer}
    </div>
  ) : (
    <div style={{ display: "flex", width: "100%", height: "100%", padding: "48px 56px", gap: 48, background: BG, color: CREAM, fontFamily: FONT }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", width: 300 }}>
        {Logo}
        <Avatar size={250} />
        <div style={{ display: "flex", fontSize: 26, color: MUTED }}>mafiacl.com</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 800, lineHeight: 1 }}>{player.nickname}</div>
          <div style={{ display: "flex", fontSize: 28, color: MUTED }}>{[player.memberNo ? `ID ${formatMemberNo(player.memberNo)}` : null, cityLabel(player.city, locale), t("shareClub")].filter(Boolean).join(" · ")}</div>
        </div>
        {Titles}
        <div style={{ display: "flex", gap: 16 }}>{stats.map(StatBox)}</div>
        {s.games > 0 && Roles}
      </div>
    </div>
  );

  return new ImageResponse(body, {
    ...SIZE[format],
    fonts: fontData,
    headers: { "Cache-Control": "public, max-age=300, s-maxage=600" },
  });
}
