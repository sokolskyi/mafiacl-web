import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Общие части картинок для соцсетей (Satori / next/og): шрифты, логотип, аватар. */

// Цвета совпадают с токенами globals.css (в картинке CSS-переменные не работают).
export const RED = "#e60000";
export const CREAM = "#fdffc2"; // --color-white
export const MUTED = "#cabfa6"; // --color-neutral-500
export const SOFT = "#efedc0"; // --color-neutral-200
export const GOLD_200 = "#fde68a";
export const GOLD_300 = "#fcd34d";
export const GOLD_400 = "#fbbf24";
export const GOLD_500 = "#d4a017";
export const FONT = "SSC-latin, SSC-latin-ext, SSC-cyrillic";
export const BG = "linear-gradient(160deg, #4a1220 0%, #2a050b 55%, #1c0308 100%)";

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 800; style: "normal" }[]> | null = null;
export function fonts() {
  fontsPromise ??= Promise.all(
    (["latin", "latin-ext", "cyrillic"] as const).flatMap((subset) =>
      ([400, 800] as const).map(async (weight) => ({
        // Своё имя на каждый набор символов: шрифты с одинаковым именем Satori не сочетает.
        name: `SSC-${subset}`,
        data: await readFile(join(process.cwd(), "assets/fonts", `sofia-sans-condensed-${subset}-${weight}-normal.woff`)),
        weight,
        style: "normal" as const,
      })),
    ),
  );
  return fontsPromise;
}

let logoPromise: Promise<string> | null = null;
export function logo() {
  logoPromise ??= readFile(join(process.cwd(), "public/brand/mafiacl-wordmark-dark.svg")).then(
    (b) => `data:image/svg+xml;base64,${b.toString("base64")}`,
  );
  return logoPromise;
}

/** Аватар заранее, как data URL: если внешний сервер не ответил, рисуем первую букву ника. */
export async function avatar(url: string | null): Promise<string | null> {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 2_000_000) return null;
    // Картинку рисует Satori: он не понимает WebP (аватары хранятся в WebP) — переводим в PNG.
    if (type !== "image/png" && type !== "image/jpeg") {
      const { default: sharp } = await import("sharp");
      const png = await sharp(buf).resize(512, 512, { fit: "cover" }).png().toBuffer();
      return `data:image/png;base64,${png.toString("base64")}`;
    }
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

