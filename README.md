# mafiacl-web

Новый сайт клуба MafiaCL (mafiacl.com). Каркас: 4 языка, все разделы, SEO-основа, схема базы.

## Стек

- **Next.js 16** (App Router, Cache Components, Partial Prefetching, `src/proxy.ts`)
- **next-intl 4** — языки `cs` (основной), `ru`, `uk`, `en`; адреса переведены (`/cs/hrat`, `/ru/igrat`, `/en/play`)
- **Tailwind CSS 4**
- **Supabase** — Postgres + Auth (Google/Facebook) через `@supabase/ssr`
- Хостинг: Vercel

## Структура

```
src/i18n/routing.ts         языки и переведённые адреса всех разделов
src/proxy.ts                язык + продление сессии Supabase
src/app/[locale]/…          страницы (сейчас заглушки с заголовком и описанием)
src/app/sitemap.ts          sitemap.xml: все страницы × 4 языка + hreflang
src/app/robots.ts           robots.txt (кабинет закрыт)
src/lib/seo.ts              canonical, hreflang, Open Graph
src/lib/site.ts             меню, разделы, города
src/lib/supabase/           клиенты для браузера, сервера и proxy
messages/{cs,ru,uk,en}.json тексты интерфейса и SEO-заголовки
supabase/migrations/        схема базы (RLS на всех таблицах)
```

## Запуск

```bash
cp .env.example .env.local   # заполнить ключи Supabase
npm install
npm run dev
```

## База

Миграции в `supabase/migrations`. Модель: страна → город → клуб → площадки;
профили (публичная карточка + приватные контакты); роли в клубе (owner/admin/host);
игры со столом на 10 мест и листом ожидания; гости без аккаунта; турниры.

Права:
- справочники и опубликованные игры видны всем;
- игрок записывает только себя и может только отменить свою запись;
- ведущие управляют записью своего клуба;
- роли назначает владелец клуба.

Секретный ключ Supabase хранится только в переменных окружения Vercel и никогда не попадает в браузер.
