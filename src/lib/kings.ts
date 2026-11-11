import { cacheLife } from "next/cache";

const LEGACY = process.env.LEGACY_KINGS_ORIGIN ?? "https://mafiacl.vercel.app";

/** Страница текущего сезона Kings на старом приложении (оно само знает актуальный сезон). */
export async function getKingsSeasonPath(): Promise<string> {
  "use cache";
  cacheLife("hours");
  try {
    const res = await fetch(`${LEGACY}/kings`, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    const loc = res.headers.get("location") ?? "";
    const path = loc ? new URL(loc, LEGACY).pathname : "";
    if (/^\/seasons\/\d+$/.test(path)) return path;
  } catch (e) {
    console.error("getKingsSeasonPath failed", e);
  }
  return "/seasons/12";
}
