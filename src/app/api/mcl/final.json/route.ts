// Таблицу финала MCL (вкладка Final на /mcl/final.html) считает старый проект по играм с mafgame.
// Страница запрашивает /api/mcl/final.json со своего домена — пересылаем запрос туда.
const LEGACY = process.env.LEGACY_KINGS_ORIGIN ?? "https://mafiacl.vercel.app";

export async function GET() {
  const upstream = await fetch(`${LEGACY}/api/mcl/final.json`, { cache: "no-store" });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
