import { siFacebook, siInstagram, siTelegram, siTwitch, siYoutube } from "simple-icons";
import type { SocialKind } from "@/lib/social";

const ICONS: Partial<Record<SocialKind, { path: string }>> = {
  telegram: siTelegram,
  instagram: siInstagram,
  facebook: siFacebook,
  youtube: siYoutube,
  twitch: siTwitch,
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
