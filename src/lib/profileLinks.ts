/** Профили игрока на сайтах рейтингов и турниров. Ссылка принимается, только если ведёт на сайт этого сервиса. */
export const PROFILE_SERVICES = [
  { key: "markery", label: "маркеры.онлайн", domains: ["markery.online"], example: "https://markery.online/playerStatistics?playerId=…" },
  { key: "fiim", label: "FIIM", domains: ["fiim.world"], example: "https://fiim.world/…" },
  { key: "mafgame", label: "Mafgame", domains: ["mafgame.org"], example: "https://mafgame.org/…" },
  { key: "emotion", label: "Emotion Games", domains: ["emotion.games"], example: "https://emotion.games/…" },
  { key: "imafia", label: "iMafia", domains: ["imafia.org"], example: "https://imafia.org/…" },
] as const;

export type ProfileService = (typeof PROFILE_SERVICES)[number]["key"];
export type ProfileLinks = Partial<Record<ProfileService, string>>;

/** Проверить и нормализовать ссылку: https, домен сервиса или его поддомен. null — ссылка не подходит. */
export function normalizeProfileLink(service: ProfileService, raw: string): string | null {
  const s = PROFILE_SERVICES.find((x) => x.key === service);
  if (!s) return null;
  let v = raw.trim();
  if (!v) return null;
  // markery: можно вставить просто номер игрока
  if (service === "markery" && /^\d{1,8}$/.test(v)) v = `https://markery.online/playerStatistics?playerId=${v}`;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!s.domains.some((d) => host === d || host.endsWith(`.${d}`))) return null;
  if (url.username || url.password || v.length > 300) return null;
  url.protocol = "https:";
  return url.toString();
}

/** Прочитать ссылки из базы (jsonb) — только известные сервисы и только https. */
export function parseProfileLinks(raw: unknown): ProfileLinks {
  if (!raw || typeof raw !== "object") return {};
  const out: ProfileLinks = {};
  for (const s of PROFILE_SERVICES) {
    const v = (raw as Record<string, unknown>)[s.key];
    if (typeof v === "string") {
      const n = normalizeProfileLink(s.key, v);
      if (n) out[s.key] = n;
    }
  }
  return out;
}
