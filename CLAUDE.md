@AGENTS.md

# Карта проекта mafiacl-web

Рабочая шпаргалка: где что лежит, чтобы быстро находить нужные файлы при правках.
Код — источник истины. При заметных изменениях (новый раздел, таблица, задача по расписанию) обновляй этот файл в том же коммите.

## Окружение

- Новый сайт клуба MafiaCL. Тест: https://mafiacl-web.vercel.app (noindex через `NEXT_PUBLIC_NOINDEX`). Запуск на mafiacl.com — начало февраля 2027.
- Vercel: проект `prj_1ZFavpbYytLORhSs3s9pdF85hjC1`, команда `mafiacl`. Пуш в `main` = деплой.
- Supabase: проект `xdvglckdfbafhvpmrmle`. Миграции — `supabase/migrations/` (применять через MCP `apply_migration`, файл класть в репо с тем же именем).
- Старый сайт (не трогать без запроса): репо `sokolskyi/mafiacl`, Flask `app.py`, Vercel-проект `mafiacl`, живой mafiacl.com. Там же раздел `/mcl/` (зеркало dovod-mafia.com + страница финала `scripts/build_mcl_final.py`) и старое приложение Kings (`LEGACY_KINGS_ORIGIN`).
- `/mcl/` на новом сайте — **архив MCL Europe 2026**, не зависит ни от старого проекта, ни от mafgame: статические файлы в `public/mcl/` (перенесены `scripts/mcl-freeze.mjs` из `mafiacl/public/mcl` со вставкой полоски MafiaCL, видео на весь экран и блока «Фото финала» из `public/mcl-final/`); таблица финала — снимок `public/mcl/data/final.json` (25.11.2026, все 16 игр); аватарки игроков и исходные данные турнира 757 с mafgame переносит GitHub Actions `.github/workflows/mcl-archive.yml` → `scripts/mcl-archive-avatars.mjs` (в `public/mcl/assets/avatars/` и `data/mcl-2026/`). `/mcl/` → `/mcl/index.html` — rewrite в `next.config.ts`.
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

## Дизайн и доступность — как работать

- Дизайн-правила (утверждены 2026-11-24, `.design-steward/2026-11-24-align/decisions.json`):
  - Поверхности — бордовые `neutral-950/900`; почти чёрный только в просмотре фото (`.hall-lightbox`).
  - Золото — только `gold-100…500` (`--color-gold-*`): награды, Respect, чемпионы. `yellow-*`/`amber-*` и ручные hex не использовать.
  - Белый — кремовый (`text-white` = `#fdffc2`, в CSS `var(--color-white)`), не `#fff`. Фокус — только глобальный кремовый.
  - Кнопки: `rounded-full` — главное действие публичной страницы (Записаться, Купить, Оплатить, Отправить заявку) и парная контурная кнопка; `rounded` — формы, кабинет, админка, служебные. Красная — главное действие, золотая — действие с Respect.
  - h2: витрина (главная, О клубе, Зал славы, Gala, турниры, блог, FAQ, корпоративы) — `font-display text-3xl font-extrabold uppercase`; рабочие экраны (рейтинги, профиль, кабинет, админка, магазин) — `text-xl font-bold`.
  - Картинка для соцсетей `api/share/player` — те же цвета константами (CSS-переменные там не работают).
- Новое правило дизайна — сначала решение владельца, потом запись здесь и в `decisions.json`; не плодить новые hex-цвета и формы кнопок.
- Новая клиентская фича (модалка, анимация, скролл, формы) — сначала `modern-web-guidance` (search → retrieve).
- После заметной правки страницы — проверка доступности (WCAG 2.2 AA): контраст ≥ 4.5:1, видимый фокус (глобальный `:focus-visible` в `globals.css`), цели ≥ 24px, один `h1`, без пропуска уровней заголовков, 390px без горизонтального скролла, `prefers-reduced-motion`.
- `aria-label` на `<span>`/`<div>` без роли не работает — добавлять `role="img"` (или использовать `sr-only`-текст).
- Тексты интерфейса — по навыку ux-writing: коротко, глаголом на кнопках, ошибки говорят, что делать.
- Ссылка «Перейти к содержимому» — в `app/[locale]/layout.tsx` (якорь `#content`, стиль `.skip-link`).
- Скрипты (axe и т.п.) в браузере запускать только на публичных страницах, не в кабинете и админке.

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
| Играть (расписание, запись) | `play/` | `lib/games.ts` (у игры `scheduleId`, `tableSize`/`maxCapacity` — столы), `lib/games-actions.ts`, `lib/venues.ts` | `components/games/GameList*.tsx` — лента билетов (макет «B» на холсте «MafiaCL — расписание игр»): корешок с датой, места «стульями» (вторник — ряд на стол, следующий стол бледный до набора; воскресенье — 10 + места по очереди пунктиром); `TicketStrip.tsx` — фильтр по серии, полоска дней, на компьютере лента вбок со snap |
| Fun-игра (бланк без рейтинга) | `fun-game/` | хранится в localStorage `mcl-fun-sheet` (журнал, места, `setup`); «Своя игра» — `Setup` в `lib/match/engine.ts` (4–20 мест, число ролей, свои роли `cb*` за мафию / `cr*` за мирных, мирные — остаток), последний состав — `mcl-fun-setup-draft` | `components/match/FunSheet.tsx` → `MatchApp` с `fun` и `setup`; форма `CustomSetup.tsx` |
| Подсказки ников в бланке | — | `lib/match/nickSearch.ts` (не та раскладка RU/UK↔EN, кириллица вместо латиницы: «Екумукн», «Тревори» → Trevery); ники: профили + архивы (`getKnownPlayers`) | `components/match/NickInput.tsx` (combobox) |
| Электронный бланк ведущего | `admin/matches/[id]/` | `lib/match/{engine,actions,queries,types}.ts` (журнал действий → состояние); голосом — `lib/match/voiceCommands.ts` (фраза → состав по местам / фол / снять фол / выставление «N выставляет M»), ник из речи — `matchSpokenNick` в `nickSearch.ts` | `components/match/MatchApp.tsx` (`onVoice`: состав в нулевую ночь, днём — одной записью журнала, одна отмена), `VoiceInput.tsx` (Web Speech API: Chrome/Edge/Safari, язык ru/uk/cs/en в `localStorage` `mcl-voice-lang`) |
| Плашка для трансляции | `app/stream/[club]/[table]/` + `api/stream/...` | `lib/match/queries.ts` | `Overlay.tsx` |
| Рейтинги сезона | `ratings/` | `lib/rating.ts` (RPC `season_rating*`, `evening_*`) | `components/rating/*` |
| Архив рейтингов Прага/Харьков | `ratings/prague/[slug]`, `ratings/kharkiv/[slug]` | `lib/ratingArchive.ts`; Харьков VI–VIII и Студлига IV взяты со снимков старого mafiacl.com в веб-архиве (2016–2019, `source_url`); у VII и VIII роли восстановлены по страницам игр (`stats.rolesFrom/rolesOf`, `stats.noExtra` — допов нет); у Харькова полная таблица показывается, только если есть роли | `ArchiveSeason*.tsx` |
| Игроки (каталог) | `players/` | `lib/playersDirectory.ts` (колонки «Турниры», «Серии»: `mafgameKind`) | `PlayersDirectory.tsx` |
| Профиль игрока | `players/[nick]/` | `lib/players.ts`, `lib/awards.ts`, `lib/badges.ts`, `lib/clubCompare.ts`, `lib/mafgame/queries.ts` | `PlayerProfile.tsx`, `PlayerShare.tsx`; картинка — `api/share/player` |
| Ники/алиасы, «В клубе с» | — | `lib/playerNames.ts`, `lib/aliases*.ts` (`getClubSince` — таблица `player_club_since`, ручной год важнее расчётного) | `admin/AliasesAdmin.tsx` (обе формы) |
| Турниры | `tournaments/`, `tournaments/[slug]` | `lib/tournaments.ts`, `lib/tournament-actions.ts`, `lib/tournamentBrands.ts` | `components/tournaments/*` |
| Архив турниров ФИИМ (Харьков 2013–2022, Прага 2023–2024) | `tournaments/archive`, `tournaments/archive/[key]` | `lib/fiimArchive.ts` ← `src/content/fiim/{index,archive}.json`; их собирает `scripts/fiim-parse.py` из `data/fiim/raw/` (страницы ФИИМ сохраняет GitHub Actions `.github/workflows/fiim-archive.yml` → `scripts/fiim-archive.mjs`); список и разметка «наш / серия лиги» — `data/fiim/tournaments.json` (`ours` — в статистику клуба, `project && !ours` — серии лиг клуба у других клубов, не в статистику); 2013 — вручную `data/fiim/mafiacl-championship-2013.json`. Старый mafiacl.com (2016–2017) из веб-архива: страницы `/mafia_stars_results/<id>` сохраняет GitHub Actions `.github/workflows/legacy-mafiacl-archive.yml` → `scripts/legacy-mafiacl-archive.mjs` в `data/legacy-mafiacl/`; из них — MCL 2016/2017 (серии + финал, итог по ИК; на ФИИМ у него чужая таблица), туры Mafia Stars 2016/2017, Маф-марафоны 2016/2017, Kharkiv Cup 2017, «Зачётные дни» 2016/2017, Mafia School (`approx_date` — только год); протоколы игр `/show_game/<id>` (что сохранилось) — в `stage.games`, на странице раскрываются под таблицей. MCL 2022/2023 Europe и Ukraine — с the-mafia.net: GitHub Actions `.github/workflows/themafia-archive.yml` → `scripts/themafia-archive.mjs` в `data/themafia/` (серии в Праге и Харькове — `ours`, в других городах — серии лиги; места сезона — `podium` из зала славы, `season_year` для финала Europe в январе 2024). Розыгрыши брендов получают ссылку на таблицу в `editionsOf` | `components/tournaments/ArchiveViews.tsx` |
| Kings | `/<язык>/kings` → `/<язык>/kings/<год>/...` (`app/[locale]/kings/route.ts` + `[year]/[[...rest]]/route.ts`) | `lib/kings.ts` (текущий сезон старого приложения), `lib/kingsPage.ts`: страницы старого приложения `/seasons/<id>/...` в общем кеше `"use cache: remote"` (обновление в фоне раз в 5 мин, тег `kings`), год ↔ номер сезона с вкладок сезонов (`getKingsSeasons`), ссылки на странице переписываются на наши адреса, полоска MafiaCL сверху; администратору Kings (cookie `session`) и формам — напрямую. Старые `/seasons/...` → 308 на новые (`app/seasons/[...path]`). Прогрев `api/cron/kings-warm` | — |
| Зал славы | `hall-of-fame/` | `lib/hallArchive.ts` (таблица `hall_of_fame`, фото в `public/hall/`, после правки — `select private.site_revalidate(array['hall-archive'])`) | `HallArchive.tsx` (карточки сезонов), `hall/HallPhotos.tsx` (фото-«полароиды»), общий просмотр фото `hall/usePhotoLightbox.tsx`; стили `.hall-*` в `globals.css` |
| Respect (валюта клуба) | `respect/`, `admin/respect` | `lib/respect*.ts`; начисления в БД (`respect_award_match`, `respect_award_mafgame`, ДР, коды); праздничное окно о новых начислениях — `getUnseenRespect` + `markRespectSeen` (RPC `respect_mark_seen`, поле `profile_private.respect_seen_id`) | `components/respect/*` (`AccountRespect`, `RespectCelebration`, `RespectBalance`; стили `.rc-*` в `globals.css`), `admin/AdminRespect.tsx` |
| Магазин | `shop/`, `shop/[slug]`, `shop/cart`, `shop/orders/[id]`, `admin/shop` | `lib/shop/{queries,actions,payment}.ts` (`SHOP_PAYMENT_MODE`: gopay/demo/на месте), `lib/admin/shop-*.ts` | `components/shop/*`, `admin/AdminShop.tsx` |
| Блог | `blog/`, `blog/[slug]` | `lib/blog-posts.ts`, `lib/blog-actions.ts`; соц-часть `lib/blog-social*.ts` + `api/blog/[slug]` (просмотры, реакции, комментарии), уведомление автору `lib/blog-notify.ts` | `components/blog/*`, `account/AccountBlog.tsx`, `admin/PostsAdmin.tsx` |
| Обзоры сезона | `blog/` (тексты `reviews.*`) | `lib/reviews/*` (сбор, анализ, сохранение, Telegram), cron `season-review` | — |
| Отзывы (страница `/reviews` = «Отзывы») | `reviews/` | `lib/testimonials.ts` (таблица `testimonials`, `kind` corporate/player), форма `lib/testimonial-actions.ts` (скрытое поле, лимиты по IP, фото → sharp 400×400 WebP → бакет `testimonials`; приходит `active=false`, `source=site`, уведомление в Telegram); тексты `testimonials.*` | `components/reviews/ReviewForm.tsx`, список `corporate/Testimonials.tsx`; одобрение — админка `#testimonials` |
| Обучение / правила | `learn/` | `lib/learnVideos.ts`, `lib/masterclasses.ts` | `YouTubeCards.tsx` |
| О клубе | `about/*` (history, code, team, promotions, bans, gala) | `lib/promotions.ts`, `lib/bans.ts`, `lib/gala.ts` (номинации и фото Gala Night, фото в `public/gala/`) | `about/AboutNav.tsx`; фотомозаика `hall/PhotoMosaic.tsx` |
| Ведущие | `hosts/` | `lib/hosts.ts` | `HostCards.tsx` |
| Корпоративы / детская / франшиза | `corporate/`, `kids/`, `franchise/` | `lib/corporate-actions.ts`, `lib/corporatePhotos.ts`, `lib/testimonials.ts` | `components/corporate/*`, `franchise/FranchiseForm.tsx` |
| Партнёры | `partners/` | `lib/partners.ts` (таблица `partners`: сайт `url` + `instagram_url`; логотипы в `public/partners`, не SVG — SVG переводить в WebP через sharp) | — |
| Документы | `documents/*` | тексты в `src/content/legal/{privacy,terms,shop}/{lang}.ts`, реквизиты `operator.ts` | `documents/LegalDoc.tsx` |
| FAQ, контакты, клубы по городам, галерея | `faq/`, `contacts/`, `clubs/[city]`, `gallery/` | `lib/cities.ts`, `lib/social.ts` | — |
| Кабинет | `account/` | `lib/auth/*`, `lib/nickname-actions.ts`, `lib/avatar-actions.ts`, `lib/birthday-actions.ts`, `lib/members*.ts`, `lib/memberships.ts`, `lib/feedback-actions.ts` | `components/account/*` (вход Google/Facebook/почта, Turnstile); группы «Моё / Профиль / Аккаунт» в `AccountPanel.tsx`, `MyGames.tsx` (записи + отмена через `leaveGame` с `from=account`), `MyOrders.tsx` |
| Админка | `admin/`, `admin/games/[id]` | `lib/admin/{queries,actions,time}.ts`; заявки на ники/членство/ДР — RPC `*_requests`/`*_decide` | `components/admin/*` |

## База (Supabase)

- RLS на всех таблицах. Новой таблице права для `anon`/`authenticated` не выдаются сами — в миграции нужен явный `grant select …`. У многих таблиц права выданы по колонкам (`grant select (a, b) …`) — новой колонке нужен свой `grant`, иначе запрос падает с 42501. Чтение публичного — `lib/supabase/public.ts`; от имени пользователя — `server.ts`/`client.ts`; сервисный ключ — `admin.ts` (только сервер).
- PostgREST отдаёт максимум 1000 строк: для больших выборок — `lib/supabase/selectAll.ts`.
- Основные таблицы: `profiles`/`profile_private`, `clubs`/`club_staff`/`club_bans`, `cities`/`countries`/`venues`, `games`/`game_schedules`/`game_signups`, `matches`/`match_players`, `seasons`/`season_ratings`/`rating_archive(_rows)`, `tournaments`/`tournament_registrations`, `mafgame_tournaments`/`mafgame_results`, `player_aliases`/`player_club_since`/`player_titles`/`player_prizes`/`hall_of_fame`, `respect_ledger`/`respect_codes`, `shop_products`/`shop_variants`/`shop_orders`/`shop_order_items`/`payments`, `blog_comments`/`blog_reactions`/`blog_views`, `memberships`, `notifications`, `telegram_link_tokens`, `partners`, `hosts`, `promotions`, `testimonials`, `corporate_requests`, `season_reviews`.
- Настройки: `private.app_settings(name, value)` (например `mafgame_scan`, `mafgame_respect_from`, секрет крона).

## Автоматика

| Задача (pg_cron) | Когда | Что делает |
|---|---|---|
| `generate-scheduled-games` | 03:15 ежедневно | создаёт игры из `game_schedules` (окно предзаписи — полночь за `priority_cutoff_days` дней до игры: вторник → вс 24:00) |
| `mafgame-import` | :07 и :37 каждый час | POST `api/cron/mafgame` → `lib/mafgame/import.ts` (турниры и результаты mafgame, Respect 2 за игру за турниры MafiaCL с 01.02.2027) |
| `telegram-dispatch` | каждые 5 мин | `api/telegram/dispatch` → `lib/telegram/dispatch.ts` (очередь `notifications`) |
| `season-review` | 1-го числа 07:13 | `api/cron/season-review` → `lib/reviews/*` |
| `shop-expire-orders` | :17 каждый час | снимает неоплаченные заказы |
| `kings-warm` | каждые 5 мин | `api/cron/kings-warm` — держит в кеше свежие страницы Kings: текущий сезон, его 4 рейтинга, прошлые сезоны |

- Вызовы из БД идут через pg_net; бывают ошибки «HTTP2 framing» — перед POST делается прогревочный GET (сейчас только в mafgame-kick).
- Сброс кэша: POST `api/cron/revalidate` с заголовком `x-cron-secret` → `revalidateTag(tag, {expire: 0})`. Теги: `games`, `matches`, `tournaments`, `mafgame`, `blog-posts`, `blog-stats`, `player-aliases`, `rating-archive`, `hall-archive`, `season-reviews`, `shop`, `partners`, `hosts`, `promotions`, `testimonials`, `titles`, `bans`, `venues`, `kings`.
- Telegram: бот `lib/telegram/{bot,api,texts,games,actions}.ts`, вебхук `api/telegram/webhook`; уведомления персоналу `lib/staffNotify.ts`.

## Переменные окружения

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_NOINDEX`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `SHOP_PAYMENT_MODE`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_CHANNEL_ID`, `TELEGRAM_KINGS_CHANNEL`, `LEGACY_KINGS_ORIGIN`. Значения — только в Vercel.

## Подводные камни

- Функции и метки нельзя передавать из серверных компонентов в клиентские; в клиенте — `useTranslations`. Константы для клиента выносить в отдельный файл без `"use cache"`.
- `Date.now()` в рендере ломает правило чистоты линтера — брать время в состоянии/при загрузке данных.
- Типы `RouteContext<"/api/...">` генерируются при сборке.
- mafgame: данные в JSON `data-page` (Inertia); `wins`/`score` в результатах накопительные по этапам; клуб MafiaCL = club_id 4.
- Скрытая вкладка браузера ставит rAF на паузу — «зависшая» анимация Suspense в фоне не баг.
