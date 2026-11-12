import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Готовые разделы старого сайта (MafiaCL Kings и MCL Europe) живут в отдельном проекте Vercel «mafiacl»
// со своей базой и роботами обновления. Новый сайт показывает их на своём домене как есть — через прокси.
const LEGACY = process.env.LEGACY_KINGS_ORIGIN ?? "https://mafiacl.vercel.app";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // /mcl/ должен остаться со слешем: страница грузит файлы относительными путями.
  skipTrailingSlashRedirect: true,
  // /mcl без слэша → /mcl/ делает src/proxy.ts (здесь redirect матчит и /mcl/, получается петля).
  async rewrites() {
    return [
      { source: "/mcl/", destination: `${LEGACY}/mcl/` },
      { source: "/mcl/:path+", destination: `${LEGACY}/mcl/:path+` },
      { source: "/seasons/:path*", destination: `${LEGACY}/seasons/:path*` },
      { source: "/public/:path*", destination: `${LEGACY}/public/:path*` },
      { source: "/static/:path*", destination: `${LEGACY}/static/:path*` },
      { source: "/club/:path*", destination: `${LEGACY}/club/:path*` },
      { source: "/assets/:path*", destination: `${LEGACY}/assets/:path*` },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
