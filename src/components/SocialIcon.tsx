import { siFacebook, siInstagram, siTelegram, siTwitch, siYoutube } from "simple-icons";
import type { SocialKind } from "@/lib/social";

const ICONS: Partial<Record<SocialKind, { path: string }>> = {
  telegram: siTelegram,
  instagram: siInstagram,
  facebook: siFacebook,
  youtube: siYoutube,
  twitch: siTwitch,
  // Глобус (Material Icons «public», Apache 2.0) — ссылка на сайт.
  web: {
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  },
};

/** Значок соцсети (Simple Icons, CC0), цвет — currentColor. */
export function SocialIcon({ kind, className = "h-4 w-4" }: { kind: SocialKind; className?: string }) {
  const icon = ICONS[kind];
  if (!icon) return null;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={`${className} shrink-0 fill-current`}>
      <path d={icon.path} />
    </svg>
  );
}
