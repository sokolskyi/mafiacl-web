@AGENTS.md

# Карта проекта mafiacl-web

Рабочая шпаргалка: где что лежит, чтобы быстро находить нужные файлы при правках.
Код — источник истины. При заметных изменениях (новый раздел, таблица, задача по расписанию) обновляй этот файл в том же коммите.

## Окружение

- Новый сайт клуба MafiaCL. Тест: https://mafiacl-web.vercel.app (noindex через `NEXT_PUBLIC_NOINDEX`). Запуск на mafiacl.com — начало февраля 2027.
- Vercel: проект `prj_1ZFavpbYytLORhSs3s9pdF85hjC1`, команда `mafiacl`. Пуш в `main` = деплой.
- Supabase: проект `xdvglckdfbafhvpmrmle`. Миграции — `supabase/migrations/` (применять через MCP `apply_migration`, файл класть в репо с тем же именем).
- Старый сайт (не трогать без запроса): репо `sokolskyi/mafiacl`, Flask `app.py`, Vercel-проект `mafiacl`, живой mafiacl.com. Там же раздел `/mcl/` (зеркало dovod-mafia.com + страница финала `scripts/build_mcl_final.py`) и старое приложение Kings (`LEGACY_KINGS_ORIGIN`).
- Стек: Next.js 16 (App Router, `"use cache"` + `cacheTag`/`cacheLife`, `src/proxy.ts` вместо middleware), next-intl 4, Tailwind 4, Supabase (`@supabase/ssr`).
- Проверка перед коммитом: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Правила проекта (от владельца)

- Пароли, ключи, платёжные данные, DNS вводит только владелец. Секреты не писать в чат и в код.
- Выдача ролей, ослабление защиты, разрушительный SQL на живой базе — только с подтверждения.
- В текстах: «администрация клуба» (не «владелец»), «игры» (не «партии»).
- На сайте только ники игроков со старого сайта, без реальных имён. Rodné číslo и дату рождения из выписки не публиковать.
- Не копировать тексты конкурентов дословно.
- Регистрация с 15 лет; в FAQ «для взрослых, с 18 лет» про формат вечеров.
- Respect: игрок видит только Respect, без пересчёта в валюту (кроны — только в правилах, магазине и админке). Опора на будущее — «150 Respect = один игровой вечер в любом клубе», курс по клубу, где платят; подробности в документе проекта `claude/respect-economy.md`.

## Языки и адреса

- `src/i18n/routing.ts` — языки `cs` (основной), `ru`, `uk`, `en` и переведённые адреса всех страниц (`/ru/igrat`, `/cs/hrat` …). Новая страница = запись здесь + папка в `src/app/[locale]/`.
- `src/i18n/navigation.ts` — `Link`, `redirect`, `getPathname` с учётом переводов адресов.
- `messages/{cs,ru,uk,en}.json` — все тексты интерфейса; ключи верхнего уровня = разделы (`nav`, `play`, `players`, `rating`, `shop`, `respect`, `blogSocial`, `funGame` …). Править все 4 файла.
- `src/lib/site.ts` — меню (группы «Играть», «Клуб» …), `SECTIONS`, города. `src/lib/seo.ts` — canonical/hreflang/OG. `src/app/sitemap.ts`, `src/app/robots.ts`.
- Общие компоненты шапки/подвала: `src/components/{SiteHeader,DesktopNav,MobileMenu,TabBar,SiteFooter,LocaleSwitcher}.tsx`. Простая страница-раздел — `SectionPage.tsx`.

## Разделы сайта → файлы

Страницы в `src/app/[locale]/<путь>/page.tsx`; данные в `src/lib/*`; UI в `src/components/<раздел>/`.

| Раздел | Страница | Данные / логика | Компоненты |
|---|---|---|---|
| Главная | `page.tsx` | `lib/home.ts`, `lib/videos.ts` | `components/home/*` (HeroVideo, PlayerOfWeek, Tile) |
| Играть (расписание, запись) | `play/` | `lib/games.ts`, `lib/games-actions.ts`, `lib/venues.ts` | `components/games/GameList*.tsx` |
| Fun-игра (бланк без рейтинга) | `fun-game/` | хранится в localStorage `mcl-fun-sheet` | `components/match/FunSheet.tsx` → `MatchApp` с `fun` |
| Электронный бланк ведущего | `admin/matches/[id]/` | `lib/match/{engine,actions,queries,types}.ts` (журнал действий → состояние) | `components/match/MatchApp.tsx` |
| Плашка для трансляции | `app/stream/[club]/[table]/` + `api/stream/...` | `lib/match/queries.ts` | `Overlay.tsx` |
| Рейтинги сезона | `ratings/` | `lib/rating.ts` (RPC `season_rating*`, `evening_*`) | `components/rating/*` |
| Архив рейтингов Прага/Харьков | `ratings/prague/[slug]`, `ratings/kharkiv/[slug]` | `lib/ratingArchive.ts` | `ArchiveSeason*.tsx` |
| Игроки (каталог) | `players/` | `lib/playersDirectory.ts` (колонки «Турниры», «Серии»: `mafgameKind`) | `PlayersDirectory.tsx` |
| Профиль игрока | `players/[nick]/` | `lib/players.ts`, `lib/awards.ts`, `lib/badges.ts`, `lib/clubCompare.ts`, `lib/mafgame/queries.ts` | `PlayerProfile.tsx`, `PlayerShare.tsx`; картинка — `api/share/player` |
| Ники/алиасы | — | `lib/playerNames.ts`, `lib/aliases*.ts` | `admin/AliasesAdmin.tsx` |
| Турниры | `tournaments/`, `tournaments/[slug]` | `lib/tournaments.ts`, `lib/tournament-actions.ts`, `lib/tournamentBrands.ts` | `components/tournaments/*` |
| Kings | `kings/` | `lib/kings.ts` (ведёт на старое приложение) | — |
| Зал славы | `hall-of-fame/` | `lib/hallArchive.ts` | `HallArchive.tsx` |
| Respect (валюта клуба) | `respect/`, `admin/respect` | `lib/respect*.ts`; начисления в БД (`respect_award_match`, `respect_award_mafgame`, ДР, коды); праздничное окно о новых начислениях — `getUnseenRespect` + `markRespectSeen` (RPC `respect_mark_seen`, поле `profile_private.respect_seen_id`) | `components/respect/*` (`AccountRespect`, `RespectCelebration`, `RespectBalance`; стили `.rc-*` в `globals.css`), `admin/AdminRespect.tsx` |
| Магазин | `shop/`, `shop/[slug]`, `shop/cart`, `shop/orders/[id]`, `admin/shop` | `lib/shop/{queries,actions,payment}.ts` (`SHOP_PAYMENT_MODE`: gopay/demo/на месте), `lib/admin/shop-*.ts` | `components/shop/*`, `admin/AdminShop.tsx` |
| Блог | `blog/`, `blog/[slug]` | `lib/blog-posts.ts`, `lib/blog-actions.ts`; соц-часть `lib/blog-social*.ts` + `api/blog/[slug]` (просмотры, реакции, комментарии), уведомление автору `lib/blog-notify.ts` | `components/blog/*`, `account/AccountBlog.tsx`, `admin/PostsAdmin.tsx` |
| Обзоры сезона | `reviews/` | `lib/reviews/*` (сбор, анализ, сохранение, Telegram), cron `season-review` | — |
| Обучение / правила | `learn/` | `lib/learnVideos.ts`, `lib/masterclasses.ts` | `YouTubeCards.tsx` |
| О клубе | `about/*` (history, code, team, promotions, bans, gala) | `lib/promotions.ts`, `lib/bans.ts`, `lib/gala.ts` | `about/AboutNav.tsx` |
| Ведущие | `hosts/` | `lib/hosts.ts` | `HostCards.tsx` |
| Корпоративы / детская / франшиза | `corporate/`, `kids/`, `franchise/` | `lib/corporate-actions.ts`, `lib/corporatePhotos.ts`, `lib/testimonials.ts` | `components/corporate/*`, `franchise/FranchiseForm.tsx` |
| Партнёры | `partners/` | `lib/partners.ts` (таблица `partners`, логотипы в `public/partners`, не SVG) | — |
| Документы | `documents/*` | тексты в `src/content/legal/{privacy,terms,shop}/{lang}.ts`, реквизиты `operator.ts` | `documents/LegalDoc.tsx` |
| FAQ, контакты, клубы по городам, галерея | `faq/`, `contacts/`, `clubs/[city]`, `gallery/` | `lib/cities.ts`, `lib/social.ts` | — |
| Кабинет | `account/` | `lib/auth/*`, `lib/nickname-actions.ts`, `lib/avatar-actions.ts`, `lib/birthday-actions.ts`, `lib/members*.ts`, `lib/memberships.ts`, `lib/feedback-actions.ts` | `components/account/*` (вход Google/Facebook/почта, Turnstile) |
| Админка | `admin/`, `admin/games/[id]` | `lib/admin/{queries,actions,time}.ts`; заявки на ники/членство/ДР — RPC `*_requests`/`*_decide` | `components/admin/*` |

## База (Supabase)

- RLS на всех таблицах. Чтение публичного — `lib/supabase/public.ts`; от имени пользователя — `server.ts`/`client.ts`; сервисный ключ — `admin.ts` (только сервер).
- PostgREST отдаёт максимум 1000 строк: для больших выборок — `lib/supabase/selectAll.ts`.
- Основные таблицы: `profiles`/`profile_private`, `clubs`/`club_staff`/`club_bans`, `cities`/`countries`/`venues`, `games`/`game_schedules`/`game_signups`, `matches`/`match_players`, `seasons`/`season_ratings`/`rating_archive(_rows)`, `tournaments`/`tournament_registrations`, `mafgame_tournaments`/`mafgame_results`, `player_aliases`/`player_titles`/`player_prizes`/`hall_of_fame`, `respect_ledger`/`respect_codes`, `shop_products`/`shop_variants`/`shop_orders`/`shop_order_items`/`payments`, `blog_comments`/`blog_reactions`/`blog_views`, `memberships`, `notifications`, `telegram_link_tokens`, `partners`, `hosts`, `promotions`, `testimonials`, `corporate_requests`, `season_reviews`.
- Настройки: `private.app_settings(name, value)` (например `mafgame_scan`, `mafgame_respect_from`, секрет крона).

## Автоматика

| Задача (pg_cron) | Когда | Что делает |
|---|---|---|
| `generate-scheduled-games` | 03:15 ежедневно | создаёт игры из `game_schedules` |
| `mafgame-import` | :07 и :37 каждый час | POST `api/cron/mafgame` → `lib/mafgame/import.ts` (турниры и результаты mafgame, Respect 2 за игру за турниры MafiaCL с 01.02.2027) |
| `telegram-dispatch` | каждые 5 мин | `api/telegram/dispatch` → `lib/telegram/dispatch.ts` (очередь `notifications`) |
| `season-review` | 1-го числа 07:13 | `api/cron/season-review` → `lib/reviews/*` |
| `shop-expire-orders` | :17 каждый час | снимает неоплаченные заказы |

- Вызовы из БД идут через pg_net; бывают ошибки «HTTP2 framing» — перед POST делается прогревочный GET (сейчас только в mafgame-kick).
- Сброс кэша: POST `api/cron/revalidate` с заголовком `x-cron-secret` → `revalidateTag(tag, {expire: 0})`. Теги: `games`, `matches`, `tournaments`, `mafgame`, `blog-posts`, `blog-stats`, `player-aliases`, `rating-archive`, `hall-archive`, `season-reviews`, `shop`, `partners`, `hosts`, `promotions`, `testimonials`, `titles`, `bans`, `venues`.
- Telegram: бот `lib/telegram/{bot,api,texts,games,actions}.ts`, вебхук `api/telegram/webhook`; уведомления персоналу `lib/staffNotify.ts`.

## Переменные окружения

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_NOINDEX`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `SHOP_PAYMENT_MODE`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_KINGS_CHANNEL`, `LEGACY_KINGS_ORIGIN`. Значения — только в Vercel.

## Подводные камни

- Функции и метки нельзя передавать из серверных компонентов в клиентские; в клиенте — `useTranslations`. Константы для клиента выносить в отдельный файл без `"use cache"`.
- `Date.now()` в рендере ломает правило чистоты линтера — брать время в состоянии/при загрузке данных.
- Типы `RouteContext<"/api/...">` генерируются при сборке.
- mafgame: данные в JSON `data-page` (Inertia); `wins`/`score` в результатах накопительные по этапам; клуб MafiaCL = club_id 4.
- Скрытая вкладка браузера ставит rAF на паузу — «зависшая» анимация Suspense в фоне не баг.
